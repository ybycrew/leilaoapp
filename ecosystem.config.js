module.exports = {
  apps: [{
    name: 'scraping-api',
    script: 'scripts/scrape-server.ts',
    interpreter: 'node',
    interpreter_args: '--import tsx',
    env_file: './.env',
    env: {
      NODE_ENV: 'production'
    }
  }]
};

