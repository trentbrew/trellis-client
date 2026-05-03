function slugifyIdPart(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function repoEntityId(owner, name) {
  return `entity:github-repo-${slugifyIdPart(owner)}-${slugifyIdPart(name)}`;
}
function issueEntityId(owner, name, issueNumber) {
  return `entity:github-issue-${slugifyIdPart(owner)}-${slugifyIdPart(name)}-${issueNumber}`;
}
function prEntityId(owner, name, prNumber) {
  return `entity:github-pr-${slugifyIdPart(owner)}-${slugifyIdPart(name)}-${prNumber}`;
}
function labelNames(labels) {
  if (!labels) return [];
  return labels.map((l) => typeof l === "string" ? l : l.name).filter((n) => !!n);
}
function assigneeLogins(users) {
  if (!users) return [];
  return users.map((u) => u.login).filter(Boolean);
}
function repoFullNameFromUrl(repositoryUrl) {
  if (!repositoryUrl) return "";
  const m = repositoryUrl.match(/repos\/([^/]+\/[^/]+)$/);
  return m ? m[1] : "";
}
function normalizeRepo(raw) {
  var _a, _b, _c, _d, _e;
  const ownerLogin = ((_a = raw.owner) == null ? void 0 : _a.login) || raw.full_name.split("/")[0] || "";
  const name = raw.name || raw.full_name.split("/").slice(-1)[0] || "";
  const ownerType = ((_b = raw.owner) == null ? void 0 : _b.type) === "Organization" ? "Organization" : "User";
  return {
    id: repoEntityId(ownerLogin, name),
    githubRepoId: String(raw.id),
    name,
    fullName: raw.full_name,
    description: raw.description || "",
    url: raw.html_url || `https://github.com/${raw.full_name}`,
    cloneUrl: raw.clone_url || "",
    homepage: raw.homepage || "",
    ownerLogin,
    ownerAvatarUrl: ((_c = raw.owner) == null ? void 0 : _c.avatar_url) || "",
    ownerType,
    defaultBranch: raw.default_branch || "main",
    visibility: raw.visibility || (raw.private ? "private" : "public"),
    language: raw.language || "",
    topics: raw.topics || [],
    license: ((_d = raw.license) == null ? void 0 : _d.spdx_id) || ((_e = raw.license) == null ? void 0 : _e.name) || "",
    stars: raw.stargazers_count || 0,
    forks: raw.forks_count || 0,
    watchers: raw.watchers_count || 0,
    openIssuesCount: raw.open_issues_count || 0,
    isArchived: !!raw.archived,
    isFork: !!raw.fork,
    isPrivate: !!raw.private,
    isTemplate: !!raw.is_template,
    pushedAt: raw.pushed_at || "",
    createdAt: raw.created_at || "",
    updatedAt: raw.updated_at || ""
  };
}
function normalizeIssue(raw) {
  var _a, _b, _c, _d, _e;
  const repoFullName = ((_a = raw.repository) == null ? void 0 : _a.full_name) || repoFullNameFromUrl(raw.repository_url);
  const [owner, name] = repoFullName.split("/");
  const entityId = owner && name ? issueEntityId(owner, name, raw.number) : `entity:github-issue-${raw.id}`;
  return {
    id: entityId,
    githubIssueId: String(raw.id),
    number: raw.number,
    title: raw.title,
    body: raw.body || "",
    url: raw.html_url || "",
    state: raw.state,
    stateReason: raw.state_reason || "",
    labels: labelNames(raw.labels),
    authorLogin: ((_b = raw.user) == null ? void 0 : _b.login) || "",
    authorAvatarUrl: ((_c = raw.user) == null ? void 0 : _c.avatar_url) || "",
    assignees: assigneeLogins(raw.assignees),
    milestone: ((_d = raw.milestone) == null ? void 0 : _d.title) || "",
    commentsCount: raw.comments || 0,
    createdAt: raw.created_at || "",
    updatedAt: raw.updated_at || "",
    closedAt: raw.closed_at || "",
    repositoryFullName: repoFullName,
    repositoryId: ((_e = raw.repository) == null ? void 0 : _e.id) ? String(raw.repository.id) : ""
  };
}
function normalizePr(raw) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m;
  const repoFullName = ((_b = (_a = raw.base) == null ? void 0 : _a.repo) == null ? void 0 : _b.full_name) || ((_c = raw.repository) == null ? void 0 : _c.full_name) || repoFullNameFromUrl(raw.repository_url);
  const [owner, name] = repoFullName.split("/");
  const entityId = owner && name ? prEntityId(owner, name, raw.number) : `entity:github-pr-${raw.id}`;
  const mergeableValue = typeof raw.mergeable === "boolean" ? raw.mergeable ? "mergeable" : "conflicting" : "unknown";
  const state = raw.draft ? "draft" : raw.merged ? "merged" : raw.state;
  return {
    id: entityId,
    githubPrId: String(raw.id),
    number: raw.number,
    title: raw.title,
    body: raw.body || "",
    url: raw.html_url || "",
    state,
    draft: !!raw.draft,
    merged: !!raw.merged,
    mergedAt: raw.merged_at || "",
    mergedByLogin: ((_d = raw.merged_by) == null ? void 0 : _d.login) || "",
    mergeable: mergeableValue,
    labels: labelNames(raw.labels),
    authorLogin: ((_e = raw.user) == null ? void 0 : _e.login) || "",
    authorAvatarUrl: ((_f = raw.user) == null ? void 0 : _f.avatar_url) || "",
    assignees: assigneeLogins(raw.assignees),
    reviewers: [],
    requestedReviewers: assigneeLogins(raw.requested_reviewers),
    milestone: ((_g = raw.milestone) == null ? void 0 : _g.title) || "",
    baseBranch: ((_h = raw.base) == null ? void 0 : _h.ref) || "",
    headBranch: ((_i = raw.head) == null ? void 0 : _i.ref) || "",
    baseSha: ((_j = raw.base) == null ? void 0 : _j.sha) || "",
    headSha: ((_k = raw.head) == null ? void 0 : _k.sha) || "",
    commits: raw.commits || 0,
    additions: raw.additions || 0,
    deletions: raw.deletions || 0,
    changedFiles: raw.changed_files || 0,
    commentsCount: raw.comments || 0,
    reviewCommentsCount: raw.review_comments || 0,
    createdAt: raw.created_at || "",
    updatedAt: raw.updated_at || "",
    closedAt: raw.closed_at || "",
    repositoryFullName: repoFullName,
    repositoryId: ((_m = (_l = raw.base) == null ? void 0 : _l.repo) == null ? void 0 : _m.id) ? String(raw.base.repo.id) : ""
  };
}

export { issueEntityId, normalizeIssue, normalizePr, normalizeRepo, prEntityId, repoEntityId };
//# sourceMappingURL=_shared.mjs.map
