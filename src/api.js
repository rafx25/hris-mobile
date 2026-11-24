// base url of the project api, from .env
const API_URL = process.env.EXPO_PUBLIC_API_URL;

// Get request, returns json
export async function apiGet(path) {
  const res = await fetch(API_URL + path, { credentials: "include" });
  return res.json();
}

// POST request with json body, returns json
export async function apiPost(path, body) {
  const res = await fetch(API_URL + path, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return res.json();
}
