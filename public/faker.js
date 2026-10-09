// Tiny random test-data generator shared by the content script and the side panel.
(() => {
  if (globalThis.FDMFaker) return;

  const FIRST = ['James', 'Olivia', 'Liam', 'Emma', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason', 'Isabella', 'Lucas', 'Mia', 'Aarav', 'Diya', 'Arjun', 'Priya', 'Rohan', 'Ananya', 'Daniel', 'Grace', 'Leo', 'Chloe', 'Ryan', 'Zoe'];
  const LAST = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Wilson', 'Taylor', 'Anderson', 'Thomas', 'Moore', 'Patel', 'Shah', 'Sharma', 'Mehta', 'Clark', 'Lewis', 'Walker', 'Hall', 'Young', 'King'];
  const COMPANY_A = ['Blue', 'Bright', 'Nova', 'Prime', 'Apex', 'Silver', 'Green', 'Rapid', 'Quantum', 'Summit', 'Urban', 'Vertex'];
  const COMPANY_B = ['Labs', 'Systems', 'Solutions', 'Technologies', 'Works', 'Digital', 'Group', 'Partners', 'Dynamics', 'Networks'];
  const JOBS = ['Software Engineer', 'Product Manager', 'Designer', 'Data Analyst', 'QA Engineer', 'Marketing Manager', 'Sales Executive', 'Consultant', 'Accountant', 'Project Manager'];
  const STREETS = ['Main St', 'Oak Ave', 'Maple Dr', 'Park Rd', 'Cedar Ln', 'Elm St', 'Lake View', 'Hill Rd', 'Sunset Blvd', 'River Rd'];
  const PLACES = [
    { city: 'New York', state: 'NY', zip: '10001', country: 'United States' },
    { city: 'Austin', state: 'TX', zip: '73301', country: 'United States' },
    { city: 'San Francisco', state: 'CA', zip: '94103', country: 'United States' },
    { city: 'Seattle', state: 'WA', zip: '98101', country: 'United States' },
    { city: 'Chicago', state: 'IL', zip: '60601', country: 'United States' },
    { city: 'Boston', state: 'MA', zip: '02108', country: 'United States' },
  ];
  const DOMAINS = ['example.com', 'example.org', 'example.net', 'test.com', 'mail.test'];
  const WORDS = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat'.split(' ');

  const int = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const pick = (arr) => arr[int(0, arr.length - 1)];
  const pad = (n, len = 2) => String(n).padStart(len, '0');
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  function words(n) {
    return Array.from({ length: n }, () => pick(WORDS)).join(' ');
  }
  function sentence(min = 6, max = 12) {
    return `${cap(words(int(min, max)))}.`;
  }
  function paragraph(n = int(2, 4)) {
    return Array.from({ length: n }, () => sentence()).join(' ');
  }
  function date(fromYear = 2020, toYear = 2027) {
    const d = new Date(int(fromYear, toYear), int(0, 11), int(1, 28));
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  function time() {
    return `${pad(int(8, 18))}:${pad(pick([0, 15, 30, 45]))}`;
  }
  function phone() {
    return `${int(200, 989)}${int(200, 999)}${pad(int(0, 9999), 4)}`;
  }

  function profile() {
    const firstName = pick(FIRST);
    const lastName = pick(LAST);
    const place = pick(PLACES);
    const companyName = `${pick(COMPANY_A)} ${pick(COMPANY_B)}`;
    const handle = `${firstName}.${lastName}${int(1, 999)}`.toLowerCase();
    return {
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      email: `${handle}@${pick(DOMAINS)}`,
      phone: phone(),
      company: companyName,
      jobTitle: pick(JOBS),
      address1: `${int(10, 9999)} ${pick(STREETS)}`,
      address2: Math.random() < 0.5 ? `Apt ${int(1, 999)}` : `Suite ${int(100, 900)}`,
      city: place.city,
      state: place.state,
      zip: place.zip,
      country: place.country,
      website: `https://www.${companyName.toLowerCase().replace(/\s+/g, '')}.example`,
      dob: date(1965, 2004),
      username: handle.replace('.', '_'),
    };
  }

  globalThis.FDMFaker = { int, pick, words, sentence, paragraph, date, time, phone, profile };
})();
