import bcrypt from 'bcryptjs';
import { pool } from '../src/db.js';
import { config } from '../src/config.js';

const withDemo = process.argv.includes('--demo');

const stories = [
  {
    slug: 'welcome-to-promise-to-palestine',
    title: {
      en: 'Welcome to Promise to Palestine',
      ar: 'مرحبًا بكم في وعدٌ لفلسطين',
      ur: 'وعدہ برائے فلسطین میں خوش آمدید',
      fr: 'Bienvenue sur Promise to Palestine',
      tr: "Promise to Palestine'e Hoş Geldiniz",
      es: 'Bienvenidos a Promise to Palestine',
    },
    summary: {
      en: 'Why we started, and what we promise to you.',
      ar: 'لماذا بدأنا، وماذا نعدكم به.',
      ur: 'ہم نے آغاز کیوں کیا، اور ہم آپ سے کیا وعدہ کرتے ہیں۔',
      fr: 'Pourquoi nous avons commencé, et ce que nous vous promettons.',
      tr: 'Neden başladık ve size ne vaat ediyoruz.',
      es: 'Por qué empezamos y qué le prometemos.',
    },
    body: {
      en: 'This project began from the heart: a simple belief that compassion should not stop at a border. Every promise made here is a promise to stand beside families in Palestine with food, clean water, medical care and shelter.\n\nWe promise to be open about where every contribution goes, and to share updates as they happen.',
      ar: 'بدأ هذا المشروع من القلب: إيمانٌ بسيط بأن الرحمة لا تتوقف عند الحدود. كل وعد يُقطع هنا هو وعدٌ بالوقوف إلى جانب العائلات في فلسطين بالغذاء والماء النظيف والرعاية الطبية والمأوى.\n\nنعدكم بالشفافية في وجهة كل مساهمة، وبمشاركة المستجدات أولًا بأول.',
      ur: 'یہ منصوبہ دل سے شروع ہوا: ایک سادہ یقین کہ ہمدردی سرحدوں پر نہیں رکتی۔ یہاں کیا گیا ہر وعدہ فلسطین کے خاندانوں کے ساتھ کھانے، صاف پانی، طبی امداد اور پناہ کے ذریعے کھڑے ہونے کا وعدہ ہے۔\n\nہم وعدہ کرتے ہیں کہ ہر عطیہ کہاں جاتا ہے اس میں شفافیت رکھیں گے اور تازہ ترین معلومات شیئر کرتے رہیں گے۔',
      fr: "Ce projet est né du cœur : la conviction simple que la compassion ne s'arrête pas aux frontières. Chaque promesse faite ici est une promesse de soutenir les familles de Palestine avec de la nourriture, de l'eau potable, des soins médicaux et un abri.\n\nNous promettons de vous dire en toute transparence où va chaque contribution et de partager les nouvelles au fur et à mesure.",
      tr: 'Bu proje yürekten başladı: Merhametin sınırlarda durmaması gerektiği yönünde basit bir inanç. Burada verilen her söz, Filistin\'deki ailelerin yanında yiyecek, temiz su, tıbbi bakım ve barınakla durma sözüdür.\n\nHer katkının nereye gittiği konusunda şeffaf olacağımıza ve gelişmeleri paylaşacağımıza söz veriyoruz.',
      es: 'Este proyecto nació del corazón: la creencia sencilla de que la compasión no se detiene en una frontera. Cada promesa hecha aquí es una promesa de acompañar a las familias de Palestina con alimentos, agua potable, atención médica y refugio.\n\nPrometemos ser transparentes sobre el destino de cada contribución y compartir novedades a medida que ocurran.',
    },
  },
];

const client = await pool.connect();
try {
  await client.query('BEGIN');

  const { rows: [campaign] } = await client.query(
    `INSERT INTO campaigns (slug, goal_cents, currency, allocation)
     VALUES ($1, $2, 'USD', $3)
     ON CONFLICT (slug) DO UPDATE SET slug = EXCLUDED.slug
     RETURNING id`,
    [config.campaignSlug, 10_000_000, JSON.stringify({ food: 30, water: 20, medical: 30, shelter: 20 })],
  );

  const items = [
    ['water', 1000, 'droplet'],
    ['food', 2500, 'bread'],
    ['medical', 5000, 'heart'],
    ['shelter', 10000, 'home'],
  ];
  for (const [i, [key, cents, icon]] of items.entries()) {
    await client.query(
      `INSERT INTO impact_items (campaign_id, key, amount_cents, icon, sort_order)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (campaign_id, key) DO UPDATE SET amount_cents = EXCLUDED.amount_cents`,
      [campaign.id, key, cents, icon, i],
    );
  }

  for (const s of stories) {
    await client.query(
      `INSERT INTO stories (slug, title, summary, body) VALUES ($1,$2,$3,$4)
       ON CONFLICT (slug) DO NOTHING`,
      [s.slug, s.title, s.summary, s.body],
    );
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    if (adminPassword.length < 12) throw new Error('ADMIN_PASSWORD must be at least 12 characters');
    await client.query(
      `INSERT INTO admins (email, password_hash) VALUES ($1,$2)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
      [adminEmail.toLowerCase(), await bcrypt.hash(adminPassword, 12)],
    );
    console.log(`✔ Admin account ready: ${adminEmail}`);
  } else {
    console.log('ℹ Set ADMIN_EMAIL and ADMIN_PASSWORD (12+ chars) and re-run seed to create an admin.');
  }

  // Sample pledges are for LOCAL DEVELOPMENT ONLY, clearly labelled, and refused in production.
  if (withDemo) {
    if (config.isProd) throw new Error('Refusing to insert sample pledges in production');
    const samples = [
      ['Sample Donor A', 'PK', 2500, 'Sample message (dev data)'],
      ['Sample Donor B', 'GB', 5000, 'Sample message (dev data)'],
      ['Sample Donor C', 'TR', 1000, 'Sample message (dev data)'],
    ];
    for (const [name, country, cents, msg] of samples) {
      await client.query(
        `INSERT INTO pledges (campaign_id, donor_name, email, country, message, amount_cents, status, provider, completed_at)
         VALUES ($1,$2,'sample@example.invalid',$3,$4,$5,'completed','demo', now())`,
        [campaign.id, name, country, msg, cents],
      );
    }
    console.log('✔ Inserted clearly-labelled sample pledges (dev only)');
  }

  await client.query('COMMIT');
  console.log('✔ Seed complete');
} catch (err) {
  await client.query('ROLLBACK');
  console.error('Seed failed:', err.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
