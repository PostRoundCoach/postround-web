import { ReplitConnectors } from "@replit/connectors-sdk";

const connectors = new ReplitConnectors();

// Get authenticated user
const userResp = await connectors.proxy("github", "/user", { method: "GET" });
const user = await userResp.json();
const login = user.login;
console.log("LOGIN:" + login);

// Check if repo exists
const checkResp = await connectors.proxy("github", `/repos/${login}/postround-web`, { method: "GET" });

if (checkResp.status === 404) {
  const createResp = await connectors.proxy("github", "/user/repos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "postround-web",
      description: "Post Round Coach — AI golf coaching web app and marketing site",
      private: false,
      auto_init: false,
    }),
  });
  const created = await createResp.json();
  console.log("ACTION:created");
  console.log("CLONE_URL:" + created.clone_url);
  console.log("HTML_URL:" + created.html_url);
} else {
  const repo = await checkResp.json();
  console.log("ACTION:exists");
  console.log("CLONE_URL:" + repo.clone_url);
  console.log("HTML_URL:" + repo.html_url);
}
