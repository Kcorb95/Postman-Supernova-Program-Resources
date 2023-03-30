const core = require('@actions/core');
const github = require('@actions/github');
const { promises: fs } = require('fs');

async function run() {
  try {
    // Get inputs from workflow
    const payload = github.context.payload;
    const contributionName = payload.inputs.contribution_name;
    const contributionUrl = payload.inputs.contribution_url;
    const contributionAuthor = payload.inputs.contribution_author;
    let contributionDate = new Date(payload.inputs.contribution_date);
    
    // Log Inputs
    console.log(`Contribution Name: ${contributionName}`);
    console.log(`Contribution URL: ${contributionUrl}`);
    console.log(`Contribution Author: ${contributionAuthor}`);
    console.log(`Contribution Date: ${contributionDate}`);
    
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
    const filePath = "pages/contributions/Current-Contributions.md";
    const fileContent = await fs.readFile(filePath, 'utf8');
    console.log(`Old File Content Length: ${fileContent.length}`);

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
    console.log(`New Contribution: ${newEntry}`);

    // Insert the new entry in the correct place
    const newContent = fileContent.slice(0, lastEntryIndex) + newEntry + fileContent.slice(lastEntryIndex);
    console.log(`New File Content Length: ${newContent.length}`);
    
    // Commit the changes
    const accessToken = process.env.PERSONAL_ACCESS_TOKEN;
    const octokit = github.getOctokit(accessToken);
    console.log(`Access Token: ${accessToken}`);
    console.log(octokit.repos);
    const commit = await octokit.rest.repos.createOrUpdateFileContents({
      owner: process.env.GITHUB_REPOSITORY_OWNER,
      repo: process.env.GITHUB_REPOSITORY_NAME,
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

run();
