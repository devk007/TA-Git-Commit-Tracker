import axios from 'axios';

class GithubService {
  constructor() {
    const configuredTimeout = Number(process.env.GITHUB_TIMEOUT_MS);
    const timeout = Number.isFinite(configuredTimeout) && configuredTimeout > 0 ? configuredTimeout : 45000;

    this.client = axios.create({
      baseURL: 'https://api.github.com',
      timeout,
    });
  }

  parseRepoUrl(repoUrl) {
    if (!repoUrl) {
      throw new Error('Repository URL is required');
    }

    const trimmed = repoUrl.trim();
    const sshMatch = trimmed.match(/git@github.com:(?<owner>[\w.-]+)\/(?<repo>[\w.-]+)(\.git)?/i);
    const httpsMatch = trimmed.match(/https?:\/\/github.com\/(?<owner>[\w.-]+)\/(?<repo>[\w.-]+)(\.git)?/i);

    const match = sshMatch || httpsMatch;

    if (!match?.groups) {
      throw new Error(`Unsupported GitHub URL format: ${repoUrl}`);
    }

    return {
      owner: match.groups.owner,
      repo: match.groups.repo,
    };
  }

  async fetchCommits({ repoUrl, since, until }) {
    const { owner, repo } = this.parseRepoUrl(repoUrl);
    const params = {
      per_page: 100,
    };

    if (since instanceof Date) {
      params.since = since.toISOString();
    }

    if (until instanceof Date) {
      params.until = until.toISOString();
    }

    const headers = {};
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    let page = 1;
    const commits = [];

    while (true) {
      try {
        const response = await this.client.get(`/repos/${owner}/${repo}/commits`, {
          params: { ...params, page },
          headers,
        });

        const pageData = response.data?.map((item) => ({
          sha: item.sha,
          message: item.commit?.message,
          htmlUrl: item.html_url,
          authorDate: item.commit?.author?.date
            ? new Date(item.commit.author.date)
            : item.commit?.committer?.date
              ? new Date(item.commit.committer.date)
              : null,
        })) || [];

        pageData.forEach((commit) => {
          if (commit.sha && commit.authorDate) {
            commits.push(commit);
          }
        });

        if (!pageData.length || pageData.length < 100) {
          break;
        }

        page += 1;
      } catch (error) {
        if (error.response?.status === 404) {
          throw new Error(`Repository not found for ${repoUrl}`);
        }

        if (error.response?.status === 403) {
          throw new Error(
            'GitHub API rate limit exceeded. Provide a personal access token via GITHUB_TOKEN env variable.',
          );
        }

        throw error;
      }
    }

    return commits;
  }
}

const githubService = new GithubService();

export default githubService;
