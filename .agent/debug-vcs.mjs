import { TrellisVcsEngine } from 'trellis';
const root = '/Users/trentbrew/TURTLE/Projects/Packages/turtlecode/ide';
console.log('isRepo', TrellisVcsEngine.isRepo(root));
const engine = new TrellisVcsEngine({ rootPath: root });
try {
  engine.open();
  console.log('opened');
  const issue = engine.getIssue('TRL-326');
  console.log('issue', issue ? JSON.stringify({ id: issue.id, title: issue.title, status: issue.status }) : null);
} catch (e) {
  console.error('ERR', e);
}
