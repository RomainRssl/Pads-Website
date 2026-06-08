module.exports = {
  apps: [{
    name: 'pads',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/paramourduspin',
    env: {
      NODE_ENV: 'production',
      TWITCH_CLIENT_ID: '0776mbv5dv75dqcutr9llicc57gdm1',
      TWITCH_CLIENT_SECRET: 'vx2r50w3ucbikzg9lz6sa170o3r9l7',
    }
  }]
}
