const { onValueCreated, onValueWritten } = require('firebase-functions/v2/database');
const { onRequest } = require('firebase-functions/v2/https');
const { onObjectDeleted } = require('firebase-functions/v2/storage');
const slugify = require('slugify');
const admin = require('firebase-admin');

// Send email & file utilities
const fs = require('fs');
const path = require('path');
const os = require('os');
const nodemailer = require('nodemailer');
// sharp is lazy-loaded inside handleCoverImage to avoid native binary issues during CLI analysis

// Google Cloud Storage
const { Storage } = require('@google-cloud/storage');
const gcs = new Storage();

admin.initializeApp();

const DB_INSTANCE = 'alejost848-afea9';

exports.addTutorial = onValueCreated(
  { ref: '/tutorials/{seriesName}/videos/{tutorialKey}', instance: DB_INSTANCE },
  async (event) => {
    const tutorialInfo = event.data.val();
    if (!tutorialInfo) return null;

    const titleAndEpisode = String(tutorialInfo.title || '');
    const titleParts = titleAndEpisode.split(' | ');
    const episodeParts = titleAndEpisode.split('#');

    tutorialInfo.title = titleParts[0] || titleAndEpisode;
    tutorialInfo.episodeNumber = episodeParts[1]
      ? ('0' + episodeParts[1].trim()).slice(-2)
      : '01';
    tutorialInfo.slug = slugify(`${tutorialInfo.episodeNumber}-${tutorialInfo.title}`, { lower: true });
    tutorialInfo.shortDescription = tutorialInfo.description
      ? `${String(tutorialInfo.description).split('.')[0]}.`
      : '';
    tutorialInfo.seriesSlug = event.params.seriesName;

    // Update the information of the new tutorial in /tutorials
    await event.data.ref.update(tutorialInfo);
    console.log(`Tutorial "${tutorialInfo.title}" was created`);

    // Replace the oldest tutorial in home/latestTutorials with the new one
    const root = event.data.ref.root;
    const latestSnap = await root
      .child('home/latestTutorials')
      .orderByChild('publishedDate')
      .limitToFirst(1)
      .once('value');

    const updatePromises = [];
    latestSnap.forEach((childSnap) => {
      updatePromises.push(childSnap.ref.update(tutorialInfo));
    });
    await Promise.all(updatePromises);
    console.log(`Tutorial "${tutorialInfo.title}" was added to latestTutorials`);

    // Add 1 to tutorialCount
    const tutorialCountPromise = admin
      .database()
      .ref('dashboard/overview/tutorialCount')
      .transaction((number) => (number || 0) + 1);

    // Add notification
    const notification = {
      title: `New tutorial: ${tutorialInfo.title}`,
      body: tutorialInfo.shortDescription,
      icon: '/images/manifest/icon-72x72.png',
      click_action: `https://alejo.st/tutorial/${tutorialInfo.seriesSlug}/${tutorialInfo.slug}`,
      publishedDate: admin.database.ServerValue.TIMESTAMP,
    };
    const notificationPromise = admin.database().ref('dashboard/notifications').push(notification);

    await Promise.all([tutorialCountPromise, notificationPromise]);
    console.log(`Notification added for "${tutorialInfo.title}".`);
    return null;
  }
);

exports.addWork = onValueWritten(
  { ref: '/works/{workSlug}', instance: DB_INSTANCE },
  async (event) => {
    const workSlug = event.params.workSlug;

    // On delete
    if (!event.data.after.exists()) {
      const bucket = gcs.bucket('alejost848-afea9.appspot.com');
      await bucket.deleteFiles({ prefix: `works/${workSlug}` });
      console.log(`Work "${workSlug}" deleted.`);
      await admin
        .database()
        .ref('dashboard/overview/workCount')
        .transaction((number) => Math.max(0, (number || 0) - 1));
      return null;
    }

    const work = event.data.after.val();

    // On create
    if (!event.data.before.exists()) {
      const updates = getUpdatedObject(work);
      const autocompletePromise =
        Object.keys(updates).length > 0
          ? admin.database().ref('dashboard/autocompleteSuggestions').update(updates)
          : Promise.resolve();

      const workCountPromise = admin
        .database()
        .ref('dashboard/overview/workCount')
        .transaction((number) => (number || 0) + 1);

      const coverImagePromise = handleCoverImage(workSlug, work);

      const notification = {
        title: `New work: ${work.title}`,
        body: work.shortDescription,
        icon: '/images/manifest/icon-72x72.png',
        click_action: `https://alejo.st/work/${workSlug}`,
        publishedDate: admin.database.ServerValue.TIMESTAMP,
      };
      const notificationPromise = admin.database().ref('dashboard/notifications').push(notification);

      await Promise.all([autocompletePromise, workCountPromise, notificationPromise, coverImagePromise]);
      console.log(`"${workSlug}" processing completed.`);
      return null;
    }

    // On edit — skip if this write was just handleCoverImage saving the compressed cover URL
    const beforeWork = event.data.before.val();
    const afterCoverName = work?.coverImage?.path ? path.basename(work.coverImage.path) : '';
    const beforeCoverName = beforeWork?.coverImage?.path ? path.basename(beforeWork.coverImage.path) : '';
    if (afterCoverName.startsWith('compressed_') && !beforeCoverName.startsWith('compressed_')) {
      return null;
    }

    const updates = getUpdatedObject(work);
    const autocompletePromise =
      Object.keys(updates).length > 0
        ? admin.database().ref('dashboard/autocompleteSuggestions').update(updates)
        : Promise.resolve();
    const coverImagePromise = handleCoverImage(workSlug, work);

    await Promise.all([autocompletePromise, coverImagePromise]);
    console.log(`"${workSlug}" is ready to see.`);
    return null;
  }
);

async function handleCoverImage(workSlug, work) {
  const JPEG_EXTENSION = '.jpg';
  const bucket = gcs.bucket('alejost848-afea9.appspot.com');

  if (!work || !work.coverImage || !work.coverImage.path) {
    return null;
  }

  const coverPath = work.coverImage.path;
  const coverDirectory = path.dirname(coverPath);
  const coverNameOnly = path.basename(coverPath, path.extname(coverPath));

  // Exit if the image is already compressed
  if (coverNameOnly.startsWith('compressed_')) {
    return null;
  }

  const compressedCoverPath = path.normalize(
    path.format({ dir: coverDirectory, name: `compressed_${coverNameOnly}`, ext: JPEG_EXTENSION })
  );
  const thumbnailPath = path.join(coverDirectory, `thumb_${coverNameOnly}${JPEG_EXTENSION}`);

  const tempCoverPath = path.join(os.tmpdir(), coverPath);
  const tempLocalDir = path.dirname(tempCoverPath);
  const tempCompressedCoverPath = path.join(os.tmpdir(), compressedCoverPath);
  const tempThumbnailPath = path.join(os.tmpdir(), thumbnailPath);

  try {
    await fs.promises.mkdir(tempLocalDir, { recursive: true });
    await bucket.file(coverPath).download({ destination: tempCoverPath });
    console.log('Image downloaded locally to', tempCoverPath);

    const sharp = require('sharp');
    // Compress cover image to JPEG quality 80 and strip metadata using sharp
    await sharp(tempCoverPath).jpeg({ quality: 80 }).toFile(tempCompressedCoverPath);
    console.log('Compressed image created at', tempCompressedCoverPath);

    await bucket.upload(tempCompressedCoverPath, {
      destination: compressedCoverPath,
      metadata: { cacheControl: 'public, max-age=691200' },
    });
    console.log('Compressed image uploaded to bucket.');

    // Generate 320x180 thumbnail (only shrink if larger, preserving aspect ratio)
    await sharp(tempCoverPath)
      .resize(320, 180, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toFile(tempThumbnailPath);
    console.log('Thumbnail created at', tempThumbnailPath);

    await bucket.upload(tempThumbnailPath, {
      destination: thumbnailPath,
      metadata: { cacheControl: 'public, max-age=691200' },
    });
    console.log('Thumbnail uploaded to bucket.');

    await bucket.file(coverPath).delete();
    console.log('Original cover removed from bucket.');

    const config = {
      action: 'read',
      expires: '03-01-2500',
    };

    const [compressedUrls, thumbnailUrls] = await Promise.all([
      bucket.file(compressedCoverPath).getSignedUrl(config),
      bucket.file(thumbnailPath).getSignedUrl(config),
    ]);

    await admin
      .database()
      .ref(`/works/${workSlug}`)
      .update({
        coverImage: {
          downloadUrl: compressedUrls[0],
          path: compressedCoverPath,
        },
        thumbnail: thumbnailUrls[0],
      });

    console.log('Images saved to the database.');
  } finally {
    await Promise.all([
      fs.promises.unlink(tempCoverPath).catch(() => {}),
      fs.promises.unlink(tempCompressedCoverPath).catch(() => {}),
      fs.promises.unlink(tempThumbnailPath).catch(() => {}),
    ]);
  }
  return null;
}

function getUpdatedObject(work) {
  const updateObject = {};
  const items = ['categories', 'clients', 'credits', 'toolsUsed'];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (work && work[item] && typeof work[item] === 'object') {
      for (const key of Object.keys(work[item])) {
        updateObject[`${item}/${key}`] = work[item][key];
      }
    }
  }
  return updateObject;
}

exports.sendNotification = onValueCreated(
  { ref: '/dashboard/notifications/{key}', instance: DB_INSTANCE },
  async (event) => {
    const notification = event.data.val();
    if (!notification) return null;

    const message = {
      topic: 'all',
      notification: {
        title: notification.title || 'Alejandro Sanclemente',
        body: notification.body || '',
      },
      webpush: {
        notification: {
          icon: notification.icon || '/images/manifest/icon-192x192.png',
          badge: '/images/manifest/icon-72x72.png',
        },
        fcmOptions: {
          link: notification.click_action || 'https://alejo.st',
        },
      },
    };

    try {
      const response = await admin.messaging().send(message);
      console.log(`Notification successfully sent to topic 'all': "${notification.title}". ID: ${response}`);
      return response;
    } catch (error) {
      console.error('Error sending notification via FCM v1:', error);
      return null;
    }
  }
);

exports.handleSubscription = onValueWritten(
  { ref: '/users/{uid}', instance: DB_INSTANCE },
  async (event) => {
    const uid = event.params.uid;

    if (!event.data.after.exists()) {
      console.log(`User: ${uid} was removed`);
      return null;
    }

    const beforeData = event.data.before.exists() ? event.data.before.val() : null;
    const afterData = event.data.after.val() || {};

    const userToken = afterData.token;
    const subscribed = afterData.subscribed;
    const prevSubscribed = beforeData ? beforeData.subscribed : undefined;
    const prevToken = beforeData ? beforeData.token : undefined;

    if (!userToken || typeof subscribed !== 'boolean') {
      return null;
    }

    // Ignore writes to /users/{uid} that didn't change subscription state or FCM token (e.g. theme changes)
    if (subscribed === prevSubscribed && userToken === prevToken) {
      return null;
    }

    const subscriptions = admin.database().ref('dashboard/overview/subscriptions');

    try {
      if (subscribed) {
        const response = await admin.messaging().subscribeToTopic(userToken, 'all');
        if (response.errors && response.errors.length > 0) {
          console.error("Errors subscribing to topic 'all':", response.errors);
        } else {
          console.log(`User ${uid} successfully subscribed to topic 'all'`, response);
          if (prevSubscribed !== true) {
            await subscriptions.transaction((number) => (number || 0) + 1);
          }
        }
      } else {
        const response = await admin.messaging().unsubscribeFromTopic(userToken, 'all');
        if (response.errors && response.errors.length > 0) {
          console.error("Errors unsubscribing from topic 'all':", response.errors);
        } else {
          console.log(`User ${uid} successfully unsubscribed from topic 'all'`, response);
          if (prevSubscribed === true) {
            await subscriptions.transaction((number) => Math.max(0, (number || 0) - 1));
          }
        }
      }
    } catch (error) {
      console.error("Error managing subscription to topic 'all':", error);
    }
    return null;
  }
);

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderEmailTemplate(templateStr, vars) {
  return templateStr.replace(/\{\{(\w+)\}\}/g, (_, key) => escapeHtml(vars[key] ?? ''));
}

// Simple in-memory IP rate limiter per function instance (max 5 submissions per 10 minutes per IP)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;

function isRateLimited(ip) {
  if (!ip) return false;
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.start > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { start: now, count: 1 });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

exports.handleFormSubmit = onRequest(
  {
    cors: ['https://alejo.st', 'https://www.alejo.st', 'https://alejost848-afea9.web.app', 'https://alejost848-afea9.firebaseapp.com'],
    secrets: ['GMAIL_EMAIL', 'GMAIL_PASSWORD'],
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    try {
      const clientIp = req.headers['fastly-client-ip'] || req.headers['x-forwarded-for'] || req.ip;
      if (isRateLimited(clientIp)) {
        return res.status(429).json({ success: false, message: 'Too many requests. Please try again later.' });
      }

      const { name, email, subject, message, hp, ts } = req.body || {};

      // 1. Honeypot check: If the hidden honeypot field is filled, silently discard (tarpit spam bots)
      if (hp && typeof hp === 'string' && hp.trim().length > 0) {
        console.warn('Spam bot detected via honeypot field');
        return res.status(200).json({ success: true, message: 'sent' });
      }

      // 2. Timestamp check: Require valid timestamp and reject submissions within < 800ms of page render
      if (!ts || typeof ts !== 'number' || Date.now() - ts < 800) {
        console.warn('Suspicious or missing submission timestamp:', ts);
        return res.status(200).json({ success: true, message: 'sent' });
      }

      // 3. Validate required fields & enforce sensible length limits
      const cleanName = name ? String(name).replace(/[\r\n"]/g, '').trim().slice(0, 100) : 'Anonymous';
      const cleanEmail = String(email || '').replace(/[\r\n]/g, '').trim().slice(0, 254);
      const cleanSubject = String(subject || '').replace(/[\r\n]/g, '').trim().slice(0, 200);
      const cleanMessage = String(message || '').trim().slice(0, 5000);

      if (!cleanEmail || !cleanSubject || !cleanMessage) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
      }

      // 4. Basic email format check
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        return res.status(400).json({ success: false, message: 'Invalid email address' });
      }

      // 5. Read email template and dispatch email safely without Handlebars
      const templateContent = await fs.promises.readFile(path.join(__dirname, 'email.html'), 'utf8');
      const replacements = {
        name: cleanName || 'Anonymous',
        email: cleanEmail,
        subject: cleanSubject,
        message: cleanMessage,
        year: String(new Date().getFullYear()),
      };
      const htmlToSend = renderEmailTemplate(templateContent, replacements);

      const gmailEmail = process.env.GMAIL_EMAIL;
      const gmailPassword = process.env.GMAIL_PASSWORD;

      const mailTransport = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailEmail,
          pass: gmailPassword,
        },
      });

      const mailOptions = {
        from: `"${replacements.name}" <${gmailEmail}>`,
        replyTo: replacements.email,
        to: gmailEmail,
        subject: `[alejo.st] ${replacements.subject}`,
        html: htmlToSend,
      };

      await mailTransport.sendMail(mailOptions);
      console.log('Contact form email sent successfully.');

      return res.status(200).json({ success: true, message: 'sent' });
    } catch (reason) {
      console.error('Error handling form submit:', reason);
      return res.status(500).json({ success: false, message: 'Server error sending email' });
    }
  }
);

exports.handleImagesDeletion = onObjectDeleted((event) => {
  const fileBucket = event.data.bucket;
  const bucket = gcs.bucket(fileBucket);
  const filePath = event.data.name;
  const directoryName = path.dirname(filePath);
  const fileName = path.basename(filePath);

  // If the compressed image is deleted, delete the thumbnail too by removing the cover folder
  if (fileName.startsWith('compressed_')) {
    return bucket.deleteFiles({ prefix: directoryName }).then(() => {
      console.log('Cover folder deleted.');
    });
  }
  return null;
});

let cachedIndexHtml = null;

function getIndexHtmlTemplate() {
  if (cachedIndexHtml) return cachedIndexHtml;

  const candidatePaths = [
    path.join(__dirname, 'hosting/index.html'),
    path.join(__dirname, '../dist/index.html'),
    path.join(__dirname, 'index.html'),
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      try {
        cachedIndexHtml = fs.readFileSync(p, 'utf8');
        return cachedIndexHtml;
      } catch (e) {
        console.warn('Error reading HTML template at', p, e);
      }
    }
  }

  // Resilient fallback HTML shell
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, minimum-scale=1, initial-scale=1, user-scalable=yes" />
    <title>Alejandro Sanclemente - Motion Designer and PWA Developer</title>
    <meta name="description" content="Interactive Media Designer based in Tuluá, Colombia. I specialize in motion design, UX design and web development." />
    <base href="/" />
    <link rel="icon" href="/favicon.ico" />
  </head>
  <body>
    <portfolio-app></portfolio-app>
    <script type="module" src="/src/app.ts"></script>
  </body>
</html>`;
}

function injectMetaIntoHtml(html, tags) {
  let modified = html;

  if (tags.title) {
    modified = modified.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(tags.title)}</title>`);
  }

  const metaElements = [
    `<meta property="og:site_name" content="Alejandro Sanclemente" />`,
    `<meta property="og:locale" content="en_US" />`,
  ];

  if (tags.description) {
    metaElements.push(`<meta name="description" content="${escapeHtml(tags.description)}" />`);
  }
  if (tags['og:title']) {
    metaElements.push(`<meta property="og:title" content="${escapeHtml(tags['og:title'])}" />`);
    metaElements.push(`<meta name="twitter:title" content="${escapeHtml(tags['og:title'])}" />`);
  }
  if (tags['og:description']) {
    metaElements.push(`<meta property="og:description" content="${escapeHtml(tags['og:description'])}" />`);
    metaElements.push(`<meta name="twitter:description" content="${escapeHtml(tags['og:description'])}" />`);
  }
  if (tags['og:type']) {
    metaElements.push(`<meta property="og:type" content="${escapeHtml(tags['og:type'])}" />`);
  }
  if (tags['og:image']) {
    metaElements.push(`<meta property="og:image" content="${escapeHtml(tags['og:image'])}" />`);
    metaElements.push(`<meta name="twitter:image" content="${escapeHtml(tags['og:image'])}" />`);
  }
  if (tags['og:url']) {
    metaElements.push(`<meta property="og:url" content="${escapeHtml(tags['og:url'])}" />`);
    if (/<link\s+rel=["']canonical["'][^>]*>/i.test(modified)) {
      modified = modified.replace(
        /<link\s+rel=["']canonical["'][^>]*>/gi,
        `<link rel="canonical" href="${escapeHtml(tags['og:url'])}" />`
      );
    } else {
      metaElements.push(`<link rel="canonical" href="${escapeHtml(tags['og:url'])}" />`);
    }
  }
  metaElements.push(`<meta name="twitter:card" content="summary_large_image" />`);
  metaElements.push(`<meta name="twitter:site" content="@alejost848" />`);
  metaElements.push(`<meta name="twitter:creator" content="@alejost848" />`);

  // Remove previous description, og, and twitter meta tags to prevent duplication
  modified = modified
    .replace(/<meta\s+name=["']description["'][^>]*>/gi, '')
    .replace(/<meta\s+property=["']og:[^"']+["'][^>]*>/gi, '')
    .replace(/<meta\s+name=["']twitter:[^"']+["'][^>]*>/gi, '');

  const injected = metaElements.join('\n    ');
  return modified.replace(/<\/head>/i, `    ${injected}\n  </head>`);
}

const DEFAULT_METADATA = {
  title: 'Alejandro Sanclemente - Motion Designer and PWA Developer',
  'og:title': 'Alejandro Sanclemente - Motion Designer and PWA Developer',
  description: 'Interactive Media Designer based in Tuluá, Colombia. I specialize in motion design, UX design and web development.',
  'og:description': 'Interactive Media Designer based in Tuluá, Colombia. I specialize in motion design, UX design and web development.',
  'og:type': 'website',
  'og:image': 'https://alejo.st/images/cover.jpg',
};

async function getMetadataForRoute(reqPath) {
  const segments = reqPath.split('/').filter(Boolean);
  const view = segments[0];

  if (view === 'work' && segments[1]) {
    const slug = segments[1];
    try {
      const snap = await Promise.race([
        admin.database().ref(`works/${slug}`).once('value'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2500)),
      ]);
      const item = snap.val();
      if (item) {
        return {
          found: true,
          title: `${item.title} - Alejandro Sanclemente`,
          'og:title': `${item.title} - Alejandro Sanclemente`,
          description: item.shortDescription || item.description || DEFAULT_METADATA.description,
          'og:description': item.shortDescription || item.description || DEFAULT_METADATA.description,
          'og:type': 'article',
          'og:image': item.videoId
            ? `https://i.ytimg.com/vi/${item.videoId}/maxresdefault.jpg`
            : item.coverImage?.downloadUrl || DEFAULT_METADATA['og:image'],
          'og:url': `https://alejo.st${reqPath}`,
        };
      }
      return {
        found: false,
        title: 'Work Not Found - Alejandro Sanclemente',
        'og:title': 'Work Not Found - Alejandro Sanclemente',
        description: DEFAULT_METADATA.description,
        'og:description': DEFAULT_METADATA.description,
        'og:type': 'website',
        'og:image': DEFAULT_METADATA['og:image'],
        'og:url': `https://alejo.st${reqPath}`,
      };
    } catch (err) {
      console.warn('Error fetching work metadata:', slug, err.message);
    }
  } else if (view === 'tutorial' && segments[1] && segments[2]) {
    const seriesName = segments[1];
    const tutorialSlug = segments[2];
    try {
      const snap = await Promise.race([
        admin.database().ref(`tutorials/${seriesName}/videos/`).orderByChild('slug').equalTo(tutorialSlug).once('value'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2500)),
      ]);
      const val = snap.val();
      if (val) {
        const item = Object.values(val)[0];
        if (item) {
          return {
            found: true,
            title: `${item.title} - Alejandro Sanclemente`,
            'og:title': `${item.title} - Alejandro Sanclemente`,
            description: item.shortDescription || item.description || DEFAULT_METADATA.description,
            'og:description': item.shortDescription || item.description || DEFAULT_METADATA.description,
            'og:type': 'article',
            'og:image': item.videoId
              ? `https://i.ytimg.com/vi/${item.videoId}/maxresdefault.jpg`
              : item.coverImage?.downloadUrl || DEFAULT_METADATA['og:image'],
            'og:url': `https://alejo.st${reqPath}`,
          };
        }
      }
      return {
        found: false,
        title: 'Tutorial Not Found - Alejandro Sanclemente',
        'og:title': 'Tutorial Not Found - Alejandro Sanclemente',
        description: DEFAULT_METADATA.description,
        'og:description': DEFAULT_METADATA.description,
        'og:type': 'website',
        'og:image': DEFAULT_METADATA['og:image'],
        'og:url': `https://alejo.st${reqPath}`,
      };
    } catch (err) {
      console.warn('Error fetching tutorial metadata:', tutorialSlug, err.message);
    }
  }

  return {
    found: true,
    ...DEFAULT_METADATA,
    'og:url': `https://alejo.st${reqPath}`,
  };
}

exports.host = onRequest(async (req, res) => {
  const baseHtml = getIndexHtmlTemplate();

  const segments = req.path.split('/').filter(Boolean);
  const isSingleView = segments[0] === 'work' || segments[0] === 'tutorial';

  if (!isSingleView) {
    res.set('Cache-Control', 'public, max-age=300, s-maxage=3600');
    return res.status(200).type('html').send(baseHtml);
  }

  try {
    const tags = await getMetadataForRoute(req.path);
    const renderedHtml = injectMetaIntoHtml(baseHtml, tags);
    const statusCode = tags.found === false ? 404 : 200;
    res.set(
      'Cache-Control',
      statusCode === 200 ? 'public, max-age=300, s-maxage=3600' : 'no-cache, no-store, must-revalidate'
    );
    return res.status(statusCode).type('html').send(renderedHtml);
  } catch (error) {
    console.error('Error in host function:', error);
    return res.status(200).type('html').send(baseHtml);
  }
});
