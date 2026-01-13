// lib/voteClient.js
export async function submitVote(username, lookId, choice) {
  const res = await fetch('/api/vote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, look_id: lookId, choice }),
  });
  return res.json();
}

export async function getVotesForLook(lookId) {
  const res = await fetch(`/api/vote?look_id=${encodeURIComponent(lookId)}`);
  return res.json(); // { votes: [...], counts: { yes: 10, no: 2 } }
}
