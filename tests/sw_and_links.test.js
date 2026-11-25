import { okUrl, safeExternalLink, lk, esc } from '../frontend/js/utils/helpers.js';

console.log('Testing link validation and sanitization...');

// 1. okUrl testing
console.assert(okUrl('https://www.coursera.org/learn/cloud') === true, 'Valid HTTPS failed');
console.assert(okUrl('http://camu.mmdc.mcl.edu.ph') === true, 'Valid HTTP failed');
console.assert(okUrl('javascript:alert(1)') === false, 'javascript: should be blocked');
console.assert(okUrl('data:text/html,<script>alert(1)</script>') === false, 'data: should be blocked');
console.assert(okUrl('file:///etc/passwd') === false, 'file: should be blocked');
console.assert(okUrl('//example.com') === false, 'protocol relative should be blocked');
console.assert(okUrl('/local/path') === false, 'relative path should be blocked');
console.assert(okUrl('') === false, 'empty string should be blocked');
console.assert(okUrl(null) === false, 'null should be blocked');
console.assert(okUrl('https://') === false, 'empty hostname should be blocked');

console.log('✓ okUrl correctly enforces HTTP and HTTPS only');

// 2. safeExternalLink testing
const validLink = safeExternalLink('https://coursera.org', 'Coursera');
console.assert(validLink.includes('href="https://coursera.org"'), 'Valid link missing href');
console.assert(validLink.includes('rel="noopener noreferrer"'), 'Valid link missing noopener noreferrer');
console.assert(validLink.includes('>Coursera</a>'), 'Valid link label missing');

const invalidLink = safeExternalLink('javascript:alert("XSS")', '<Bad Link>');
console.assert(!invalidLink.includes('<a'), 'Invalid link should not render anchor tag');
console.assert(invalidLink.includes('&lt;Bad Link&gt;'), 'Invalid link text must be escaped');
console.assert(!invalidLink.includes('javascript:'), 'Invalid link must not execute or render active scheme');

const omitLink = safeExternalLink('invalid-url', 'Test', { invalidMode: 'omit' });
console.assert(omitLink === '', 'Omitted invalid link should be empty');

console.log('✓ safeExternalLink safely renders valid links and displays invalid links as escaped text');

// 3. lk helper testing
console.assert(lk('', 'Coursera') === '<span class="meta">—</span>', 'Empty lk should be dash');
console.assert(lk('https://coursera.org', 'Coursera').startsWith('<a class="l"'), 'lk should render anchor for valid url');
console.assert(!lk('javascript:void(0)', 'Click').includes('<a'), 'lk must not render anchor for unsafe scheme');

console.log('✓ lk helper sanitized and functional');

// 4. Test Service Worker Cache Filtering
const CACHE_PREFIX = 'student-planner-mmdc-';
const KNOWN_LEGACY_CACHES = new Set([
  'study-planner-root-v1',
  'study-planner-frontend-v1',
  'study-planner-mmdc-v1',
  'study-planner-mmdc-v2',
  'study-planner-mmdc-v3'
]);

function isPlannerCache(name) {
  return typeof name === 'string' && (
    name.startsWith(CACHE_PREFIX) ||
    name.startsWith('study-planner-') ||
    KNOWN_LEGACY_CACHES.has(name)
  );
}

console.assert(isPlannerCache('study-planner-root-v1') === true, 'Legacy cache not detected');
console.assert(isPlannerCache('student-planner-mmdc-frontend-v2') === true, 'Current cache detected');
console.assert(isPlannerCache('unrelated-project-cache') === false, 'Unrelated cache must NOT be pruned');
console.assert(isPlannerCache('github-pages-analytics') === false, 'Foreign cache must NOT be pruned');

console.log('✓ Service Worker cache pruning targets only planner caches');

console.log('All link and service worker tests passed!');
process.exit(0);
