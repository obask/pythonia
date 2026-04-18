const { readdirSync, statSync } = require('node:fs')
const path = require('node:path')

const projectRoot = path.resolve(__dirname, '..')
const lessonsDir = path.resolve(
  projectRoot,
  process.env.PYTHONIA_LESSONS_DIR ?? '../pythonia--lessons/lessons',
)

function fail(message) {
  console.error(`\nPythonia lessons vault error: ${message}`)
  console.error(`Checked path: ${lessonsDir}`)
  console.error(
    'Set PYTHONIA_LESSONS_DIR=/absolute/path/to/lessons or keep the lessons worktree next to this app repo.',
  )
  process.exit(1)
}

let stats
try {
  stats = statSync(lessonsDir)
} catch {
  fail('lesson directory was not found.')
}

if (!stats.isDirectory()) {
  fail('configured lesson path is not a directory.')
}

const markdownFiles = readdirSync(lessonsDir)
  .filter((fileName) => fileName.endsWith('.md'))
  .sort()

if (markdownFiles.length === 0) {
  fail('lesson directory does not contain any .md files.')
}

console.log(`Using lessons vault: ${lessonsDir}`)
console.log(`Found ${markdownFiles.length} lesson files:`)
for (const fileName of markdownFiles) {
  console.log(`- ${fileName}`)
}
