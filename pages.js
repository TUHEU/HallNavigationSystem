/**
 * HTML pages for the website: Home and About Us.
 * (The 3D navigation page stays in server.js.)
 */

// ---------------------------------------------------------------------------
// Team data: edit names, roles, photos and bios here
// ---------------------------------------------------------------------------
const TEAM = [
  {
    name: 'Nyetam Bassong Charles',
    role: 'Scrum Master & Developer',
    image: '/images/Charles.jpeg',
    initials: 'NC',
    bio: 'Facilitates the Scrum process, keeps the team on track and helps remove blockers, while also building the application.'
  },
  {
    name: 'Imouck Njoh Rosaline',
    role: 'Product Owner & Developer',
    image: '/images/Rosaline.jpeg',
    initials: 'IR',
    bio: 'Defines the product vision, manages the backlog and sets priorities, while also building the application.'
  }
];

// ---------------------------------------------------------------------------
// Shared layout
// ---------------------------------------------------------------------------
const STYLES = `
  * { box-sizing: border-box; }
  body { margin: 0; background: #0b0f19; color: #e2e8f0; font-family: Arial, sans-serif; line-height: 1.6; }
  a { color: #38bdf8; }
  header { position: sticky; top: 0; z-index: 10; background: rgba(15, 23, 42, 0.95); border-bottom: 1px solid #334155; }
  .bar { max-width: 1000px; margin: 0 auto; padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; }
  .brand { font-weight: bold; font-size: 1.1rem; color: #f97316; text-decoration: none; }
  nav a { color: #cbd5e1; text-decoration: none; margin-left: 18px; font-size: 0.95rem; padding-bottom: 4px; }
  nav a:hover { color: #ffffff; }
  nav a.active { color: #ffffff; border-bottom: 2px solid #f97316; }
  main { max-width: 1000px; margin: 0 auto; padding: 30px 20px 60px; }
  .hero { text-align: center; padding: 50px 10px 30px; }
  .hero h1 { font-size: 2.4rem; margin: 0 0 10px; color: #ffffff; }
  .hero h1 span { color: #f97316; }
  .hero p { max-width: 640px; margin: 0 auto 24px; color: #94a3b8; font-size: 1.05rem; }
  .btn { display: inline-block; padding: 12px 22px; border-radius: 6px; background: #0284c7; color: #ffffff; text-decoration: none; font-weight: bold; margin: 5px; }
  .btn:hover { background: #0369a1; }
  .btn.secondary { background: #334155; }
  .btn.secondary:hover { background: #475569; }
  h2 { color: #f97316; margin: 40px 0 14px; font-size: 1.5rem; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 16px; }
  .card { background: #0f172a; border: 1px solid #334155; border-radius: 10px; padding: 18px; }
  .card h3 { margin: 0 0 8px; color: #ffffff; font-size: 1.05rem; }
  .card p { margin: 0; color: #94a3b8; font-size: 0.92rem; }
  .step { border-left: 4px solid #38bdf8; }
  .panel { background: #0f172a; border: 1px solid #334155; border-radius: 10px; padding: 20px; }
  .panel p { margin: 0 0 10px; color: #cbd5e1; }
  .panel ul { margin: 6px 0 0; padding-left: 20px; color: #cbd5e1; }
  .team { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; }
  .member { text-align: center; background: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 26px 20px; }
  .avatar { position: relative; width: 160px; height: 160px; margin: 0 auto 16px; border-radius: 50%; overflow: hidden; background: #1e293b; border: 3px solid #f97316; }
  .avatar span { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 2.6rem; font-weight: bold; color: #38bdf8; }
  .avatar img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .member h3 { margin: 0 0 4px; color: #ffffff; font-size: 1.2rem; }
  .role { display: inline-block; margin-bottom: 12px; padding: 4px 12px; border-radius: 20px; background: rgba(2, 132, 199, 0.2); color: #38bdf8; font-size: 0.82rem; font-weight: bold; }
  .member p { margin: 0; color: #94a3b8; font-size: 0.92rem; }
  footer { border-top: 1px solid #334155; text-align: center; padding: 20px; color: #64748b; font-size: 0.85rem; }
`;

function layout({ title, active, body }) {
  const link = (href, label, key) =>
    `<a href="${href}"${active === key ? ' class="active"' : ''}>${label}</a>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>${STYLES}</style>
</head>
<body>
  <header>
    <div class="bar">
      <a class="brand" href="/">ICT-U Campus GPS</a>
      <nav>
        ${link('/', 'Home', 'home')}
        ${link('/about', 'About Us', 'about')}
        ${link('/navigate', 'Campus Navigation', 'navigate')}
      </nav>
    </div>
  </header>
  <main>
    ${body}
  </main>
  <footer>ICT-U Multi-Level Campus GPS</footer>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Home page
// ---------------------------------------------------------------------------
function homePage() {
  const body = `
    <section class="hero">
      <h1>Find your way around <span>ICT-U</span></h1>
      <p>A 3D campus navigation system. Pick a hall, lab, office or restroom and watch the route from the Main Gate, up the staircase and along the corridor, with step-by-step directions.</p>
      <a class="btn" href="/navigate">Open Campus Navigation</a>
      <a class="btn secondary" href="/about">About Us</a>
    </section>

    <h2>What it does</h2>
    <div class="grid">
      <div class="card">
        <h3>3D campus model</h3>
        <p>The perimeter wall, main gate, spiral staircase, parking lot and six floors, from Floor -1 up to the Chapel on Floor 5.</p>
      </div>
      <div class="card">
        <h3>Multi-level routes</h3>
        <p>Routes climb the staircase floor by floor, then follow the corridor to the room you chose.</p>
      </div>
      <div class="card">
        <h3>Text directions</h3>
        <p>Every route comes with clear step-by-step instructions next to the animated 3D path.</p>
      </div>
      <div class="card">
        <h3>Floor filter</h3>
        <p>Show every floor at once, or just one, to see exactly where a hall is.</p>
      </div>
      <div class="card">
        <h3>REST API</h3>
        <p>Floors, locations, routes and search are available as JSON endpoints under <code>/api</code>.</p>
      </div>
      <div class="card">
        <h3>Tested and automated</h3>
        <p>Automated tests and a CI/CD pipeline check and package every change.</p>
      </div>
    </div>

    <h2>How to use it</h2>
    <div class="grid">
      <div class="card step"><h3>1. Choose a destination</h3><p>Select a hall, office, lab or restroom from the list, grouped by floor.</p></div>
      <div class="card step"><h3>2. Navigate</h3><p>Press <b>Navigate 3D Route</b> to draw the path from the Main Gate.</p></div>
      <div class="card step"><h3>3. Follow the path</h3><p>Watch the marker walk the route and read the directions in the panel.</p></div>
    </div>
  `;
  return layout({ title: 'ICT-U Campus GPS - Home', active: 'home', body });
}

// ---------------------------------------------------------------------------
// About Us page
// ---------------------------------------------------------------------------
function aboutPage() {
  const members = TEAM.map(m => `
      <div class="member">
        <div class="avatar">
          <span>${m.initials}</span>
          <img src="${m.image}" alt="${m.name}" onerror="this.style.display='none'">
        </div>
        <h3>${m.name}</h3>
        <div class="role">${m.role}</div>
        <p>${m.bio}</p>
      </div>`).join('');

  const body = `
    <section class="hero">
      <h1>About <span>Us</span></h1>
      <p>The team and the idea behind the ICT-U Multi-Level Campus GPS.</p>
    </section>

    <h2>Project overview</h2>
    <div class="panel">
      <p>ICT-U has several floors, many halls and a single central staircase, which makes it easy for new students and visitors to get lost. Our project is a web application that shows the campus in 3D and guides users to any hall, office, lab or restroom, from the Main Gate to the door.</p>
      <p>The application is built with Node.js and Express on the back end and Three.js for the 3D view. It follows software engineering good practice:</p>
      <ul>
        <li><b>Object-oriented design:</b> encapsulation, abstraction, inheritance and polymorphism.</li>
        <li><b>Design patterns:</b> Factory, Singleton, Repository, Strategy, Facade and Dependency Injection.</li>
        <li><b>API endpoints:</b> a REST API for floors, locations, routes and search.</li>
        <li><b>CI/CD:</b> automated tests and a pipeline that builds and publishes a Docker image.</li>
      </ul>
    </div>

    <h2>How we work</h2>
    <div class="panel">
      <p>We work in the Scrum way. The Product Owner keeps the backlog and sets priorities, the Scrum Master keeps the process running smoothly, and both of us develop the application.</p>
    </div>

    <h2>Meet the team</h2>
    <div class="team">${members}
    </div>

    <div style="text-align:center; margin-top:40px;">
      <a class="btn" href="/navigate">Try the Campus Navigation</a>
    </div>
  `;
  return layout({ title: 'ICT-U Campus GPS - About Us', active: 'about', body });
}

module.exports = { homePage, aboutPage, TEAM };