const core = require('@actions/core');
const github = require('@actions/github');
const { promises: fs } = require('fs');

async function run() {
  try {
    // Get inputs from workflow
    const contributionName = core.getInput('contribution_name');
    const contributionUrl = core.getInput('contribution_url');
    const contributionAuthor = core.getInput('contribution_author');
    let contributionDate = new Date(core.getInput('contribution_date'));

    // Format the date as "MMM. Dth"
    const nth = (d) => {
      if (d > 3 && d < 21) return 'th';
      switch (d % 10) {
        case 1:  return "st";
        case 2:  return "nd";
        case 3:  return "rd";
        default: return "th";
      }
    }
    contributionDate = contributionDate.toLocaleString('default', { month: 'short' }) + '. ' + contributionDate.getDate() + nth(contributionDate.getDate());

    // Get the content of the file
    const filePath = 'pages/contributions/Current-Contributions.md';
    const fileContent = await fs.readFile(filePath, 'utf8');

    // Find the current year's header and its index
    const currentYear = new Date().getFullYear();
    const currentYearHeader = `## ${currentYear}`;
    const currentYearHeaderIndex = fileContent.indexOf(currentYearHeader);

    // Find the last entry in the current year
    let lastEntryIndex = fileContent.indexOf(currentYearHeader, currentYearHeaderIndex + 1);
    if (lastEntryIndex === -1) {
      lastEntryIndex = fileContent.length;
    }

    // Build the new entry
    const newEntry = `- ${contributionDate}: [${contributionName}](${contributionUrl}) by ${contributionAuthor}\n`;

    // Insert the new entry in the correct place
    const newContent = fileContent.slice(0, lastEntryIndex) + newEntry + fileContent.slice(lastEntryIndex);

    // Commit the changes
    const octokit = github.getOctokit(core.getInput('PERSONAL_ACCESS_TOKEN'));
    const commit = await octokit.repos.createOrUpdateFileContents({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      path: filePath,
      message: `Add new contribution: ${contributionName}`,
      content: Buffer.from(newContent).toString('base64'),
      branch: 'main',
      sha: github.context.payload.after,
    });

    console.log(`Changes committed: ${commit.data.commit.html_url}`);
  } catch (error) {
    console.error(error);
    core.setFailed(error.message);
  }
}