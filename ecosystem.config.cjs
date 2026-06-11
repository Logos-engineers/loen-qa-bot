// PM2 (라즈베리파이 배포용): pm2 start ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'loen-qa-bot',
      script: 'src/index.js',
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      env: { NODE_ENV: 'production' },
    },
  ],
};
