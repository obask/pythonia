const path = require('node:path')

const lessonsDir = path.resolve(
  __dirname,
  process.env.PYTHONIA_LESSONS_DIR ?? '../pythonia--lessons/lessons',
)

module.exports = {
  appId: 'app.pythonia.desktop',
  productName: 'Pythonia',
  asar: true,
  files: ['dist/**/*', 'electron/**/*', 'package.json'],
  extraResources: [
    {
      from: lessonsDir,
      to: 'lessons',
    },
    {
      from: path.resolve(__dirname, 'public/pythonia-icon.png'),
      to: 'pythonia-icon.png',
    },
  ],
  mac: {
    category: 'public.app-category.education',
    target: ['dmg', 'zip'],
  },
  win: {
    target: ['nsis'],
  },
  linux: {
    target: ['AppImage'],
    category: 'Education',
  },
}
