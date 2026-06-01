'use strict';

const { db } = require('../db/connection');

const createJobStmt = db.prepare(`
  INSERT INTO jobs (id, session_id, status, message, created_at, expires_at)
  VALUES (?, ?, 'extracting', 'Abrindo a página com o browser…', ?, ?)
`);

const getJobStmt = db.prepare('SELECT * FROM jobs WHERE id = ?');

const getActiveJobBySessionStmt = db.prepare(
  'SELECT * FROM jobs WHERE session_id = ? AND expires_at > ?'
);

const deleteJobStmt = db.prepare('DELETE FROM jobs WHERE id = ?');

const cleanupExpiredJobsStmt = db.prepare(
  'DELETE FROM jobs WHERE expires_at <= ?'
);

function createJob(id, sessionId, expiresAt) {
  createJobStmt.run(id, sessionId, Date.now(), expiresAt);
}

function getJob(id) {
  return getJobStmt.get(id) ?? null;
}

function getActiveJobBySession(sessionId) {
  return getActiveJobBySessionStmt.get(sessionId, Date.now()) ?? null;
}

function updateJob(id, { status, message, result, error, error_code } = {}) {
  const fields = [];
  const values = [];

  if (status !== undefined) { fields.push('status = ?'); values.push(status); }
  if (message !== undefined) { fields.push('message = ?'); values.push(message); }
  if (result !== undefined) { fields.push('result = ?'); values.push(result); }
  if (error !== undefined) { fields.push('error = ?'); values.push(error); }
  if (error_code !== undefined) { fields.push('error_code = ?'); values.push(error_code); }

  if (fields.length === 0) return;

  values.push(id);
  db.prepare(`UPDATE jobs SET ${fields.join(', ')} WHERE id = ?`).run(...values);
}

function deleteJob(id) {
  deleteJobStmt.run(id);
}

function cleanupExpiredJobs() {
  try {
    cleanupExpiredJobsStmt.run(Date.now());
  } catch (err) {
    console.error('Failed to clean up expired jobs:', err);
  }
}

// Clean up expired jobs every 15 minutes
const _cleanupInterval = setInterval(cleanupExpiredJobs, 15 * 60 * 1000);
if (_cleanupInterval.unref) _cleanupInterval.unref();

module.exports = {
  createJob,
  getJob,
  getActiveJobBySession,
  updateJob,
  deleteJob,
  cleanupExpiredJobs
};
