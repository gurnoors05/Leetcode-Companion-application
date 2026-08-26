import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware';

const LEETCODE_GRAPHQL_URL = 'https://leetcode.com/graphql/';

const USER_PROFILE_CALENDAR_QUERY = `
  query userProfileCalendar($username: String!, $year: Int) {
    matchedUser(username: $username) {
      userCalendar(year: $year) {
        activeYears
        streak
        totalActiveDays
        submissionCalendar
      }
    }
  }
`;

const RECENT_SUBMISSIONS_QUERY = `
  query recentAcSubmissions($username: String!, $limit: Int!) {
    recentAcSubmissionList(username: $username, limit: $limit) {
      id title titleSlug timestamp
    }
  }
`;

const USER_BADGES_QUERY = `
  query userBadges($username: String!) {
    matchedUser(username: $username) {
      badges { id name shortName displayName icon hoverText medal { slug config { iconGif } } creationDate category }
      upcomingBadges { name icon progress }
    }
  }
`;

const SESSION_PROGRESS_QUERY = `
  query userSessionProgress($username: String!) {
    allQuestionsCount { difficulty count }
    matchedUser(username: $username) {
      submitStats {
        acSubmissionNum { difficulty count submissions }
      }
    }
  }
`;

async function fetchGraphql(query: string, variables: any) {
  const res = await fetch(LEETCODE_GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables })
  });
  
  if (!res.ok) throw new Error(`LeetCode API failed with status ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0].message);
  
  return json.data;
}

export const GET = withAuth(
  async (req: AuthenticatedRequest) => {
    try {
      const userRes = await db.query('SELECT leetcode_username FROM users WHERE id = $1', [req.user.id]);
      const username = userRes.rows[0]?.leetcode_username;

      if (!username) {
        return NextResponse.json({ error: 'USERNAME_NOT_SET' }, { status: 400 });
      }

      const currentYear = new Date().getFullYear();
      const previousYear = currentYear - 1;

      // Fetch all required data concurrently
      const [
        currentYearData, 
        previousYearData, 
        submissionsData, 
        badgesData, 
        progressData
      ] = await Promise.all([
        fetchGraphql(USER_PROFILE_CALENDAR_QUERY, { username, year: currentYear }),
        fetchGraphql(USER_PROFILE_CALENDAR_QUERY, { username, year: previousYear }),
        fetchGraphql(RECENT_SUBMISSIONS_QUERY, { username, limit: 15 }),
        fetchGraphql(USER_BADGES_QUERY, { username }),
        fetchGraphql(SESSION_PROGRESS_QUERY, { username })
      ]);

      const matchedUserCurrent = currentYearData?.matchedUser;
      if (!matchedUserCurrent) {
         return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 });
      }

      // 1. Process Calendar
      const calendarCurrent = JSON.parse(matchedUserCurrent.userCalendar?.submissionCalendar || '{}');
      const calendarPrev = previousYearData?.matchedUser?.userCalendar?.submissionCalendar 
        ? JSON.parse(previousYearData.matchedUser.userCalendar.submissionCalendar) 
        : {};
      
      const mergedCalendar = { ...calendarPrev, ...calendarCurrent };
      const dailyCounts: { date: string, count: number, level: number }[] = [];
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      const today = new Date();
      today.setHours(0,0,0,0);

      // Generate continuous array of last 365 days
      for (let i = 365; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        dailyCounts.push({ date: dateStr, count: 0, level: 0 });
      }

      const countsMap = new Map(dailyCounts.map(item => [item.date, item]));
      
      for (const [timestampStr, countVal] of Object.entries(mergedCalendar)) {
         const timestamp = parseInt(timestampStr, 10);
         const d = new Date(timestamp * 1000);
         const year = d.getFullYear();
         const month = String(d.getMonth() + 1).padStart(2, '0');
         const day = String(d.getDate()).padStart(2, '0');
         const dateStr = `${year}-${month}-${day}`;
         
         const count = Number(countVal);
         let level = 0;
         if (count > 0 && count <= 2) level = 1;
         else if (count >= 3 && count <= 5) level = 2;
         else if (count >= 6 && count <= 9) level = 3;
         else if (count >= 10) level = 4;

         if (countsMap.has(dateStr)) {
            const entry = countsMap.get(dateStr)!;
            entry.count = count;
            entry.level = level;
         } else if (timestamp * 1000 >= oneYearAgo.getTime()) {
           dailyCounts.push({ date: dateStr, count, level });
           countsMap.set(dateStr, dailyCounts[dailyCounts.length - 1]);
         }
      }

      dailyCounts.sort((a, b) => a.date.localeCompare(b.date));
      const rollingTotalActiveDays = dailyCounts.filter(d => d.count > 0).length;

      // Calculate the true current streak manually
      let currentStreak = 0;
      let i = dailyCounts.length - 1; // Start from today
      
      // LeetCode's current streak drops to 0 at the start of a new day until a submission is made.
      if (dailyCounts[i].count > 0) {
        // Start counting from today backwards
        while (i >= 0 && dailyCounts[i].count > 0) {
          currentStreak++;
          i--;
        }
      }

      // 2. Format Submissions
      const recentSubmissions = submissionsData?.recentAcSubmissionList || [];

      // 3. Format Badges
      const badges = badgesData?.matchedUser?.badges || [];
      const upcomingBadges = badgesData?.matchedUser?.upcomingBadges || [];

      // 4. Format Progress
      const allQuestions = progressData?.allQuestionsCount || [];
      const submitStats = progressData?.matchedUser?.submitStats?.acSubmissionNum || [];
      
      const difficultyProgress = {
        easy: {
          total: allQuestions.find((q: any) => q.difficulty === 'Easy')?.count || 0,
          solved: submitStats.find((q: any) => q.difficulty === 'Easy')?.count || 0
        },
        medium: {
          total: allQuestions.find((q: any) => q.difficulty === 'Medium')?.count || 0,
          solved: submitStats.find((q: any) => q.difficulty === 'Medium')?.count || 0
        },
        hard: {
          total: allQuestions.find((q: any) => q.difficulty === 'Hard')?.count || 0,
          solved: submitStats.find((q: any) => q.difficulty === 'Hard')?.count || 0
        }
      };

      return NextResponse.json({
        heatmap: {
          dailyCounts,
          currentStreak: currentStreak,
          totalActiveDays: rollingTotalActiveDays
        },
        recentSubmissions,
        badges: {
          earned: badges,
          upcoming: upcomingBadges
        },
        difficultyProgress
      });
    } catch (error: any) {
      console.error(error);
      return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
  }
);
