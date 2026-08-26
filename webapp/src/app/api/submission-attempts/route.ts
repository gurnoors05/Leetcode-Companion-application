import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import jwt from 'jsonwebtoken';
import { getJwtAccessSecret } from '@/lib/env';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    const token = authHeader.split(' ')[1];
    let payload: any;
    try {
      payload = jwt.verify(token, getJwtAccessSecret(), { algorithms: ['HS256'] });
    } catch (e) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = payload.id;
    const body = await req.json();
    const { leetcode_number, title, difficulty, status_msg, code_snippet, language, mistake_category } = body;

    if (!leetcode_number || !status_msg) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Try to find if this problem is already saved in the problems table to link the problem_id
    const problemRes = await db.query(
      `SELECT id FROM problems WHERE user_id = $1 AND leetcode_number = $2 LIMIT 1`,
      [userId, leetcode_number]
    );
    const problemId = problemRes.rows.length > 0 ? problemRes.rows[0].id : null;

    const insertRes = await db.query(
      `INSERT INTO submission_attempts (
         user_id, problem_id, leetcode_number, title, difficulty, 
         status_msg, code_snippet, language, mistake_category
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [
        userId, problemId, leetcode_number, title, difficulty,
        status_msg, code_snippet, language, mistake_category
      ]
    );

    return NextResponse.json({ success: true, id: insertRes.rows[0].id }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to save submission attempt:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    const token = authHeader.split(' ')[1];
    let payload: any;
    try {
      payload = jwt.verify(token, getJwtAccessSecret(), { algorithms: ['HS256'] });
    } catch (e) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = payload.id;
    const { searchParams } = new URL(req.url);
    const leetcodeNumber = searchParams.get('leetcodeNumber');
    const problemId = searchParams.get('problemId');

    let query = '';
    let params: any[] = [userId];

    if (problemId) {
      query = `SELECT * FROM submission_attempts WHERE user_id = $1 AND problem_id = $2 ORDER BY created_at DESC`;
      params.push(problemId);
    } else if (leetcodeNumber) {
      query = `SELECT * FROM submission_attempts WHERE user_id = $1 AND leetcode_number = $2 ORDER BY created_at DESC`;
      params.push(leetcodeNumber);
    } else {
      return NextResponse.json({ error: 'Must provide leetcodeNumber or problemId' }, { status: 400 });
    }

    const res = await db.query(query, params);
    return NextResponse.json({ attempts: res.rows }, { status: 200 });
  } catch (error: any) {
    console.error('Failed to fetch submission attempts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
