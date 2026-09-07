const { onValueCreated, onValueWritten } = require('firebase-functions/v2/database');
const { onRequest } = require('firebase-functions/v2/https');
const { onObjectDeleted } = require('firebase-functions/v2/storage');
const slugify = require('slugify');
const admin = require('firebase-admin');

//Send email
const fs = require('fs');
const path = require('path');
const os = require('os');
const { promisify } = require('util');
const execFile = promisify(require('child_process').execFile);
const nodemailer = require('nodemailer');
const handlebars = require('handlebars');

//Google Cloud Storage
const { Storage } = require('@google-cloud/storage');
const gcs = new Storage();

admin.initializeApp();

const DB_INSTANCE = 'alejost848-afea9';

exports.addTutorial = onValueCreated(
  { ref: '/tutorials/{seriesName}/videos/{tutorialKey}', instance: DB_INSTANCE },
  (event) => {
    let tutorialInfo = event.data.val();
    let titleAndEpisode = tutorialInfo.title;

    tutorialInfo.title = titleAndEpisode.split(" | ")[0];
    tutorialInfo.episodeNumber = ('0' + titleAndEpisode.split("#")[1]).slice(-2);
    tutorialInfo.slug = slugify(tutorialInfo.episodeNumber + "-" + tutorialInfo.title, {lower: true});
    tutorialInfo.shortDescription = tutorialInfo.description.split(".")[0] + ".";
    tutorialInfo.seriesSlug = event.params.seriesName;

    //Update the information of the new tutorial in /tutorials
    return event.data.ref.update(tutorialInfo)
    .then(() => {
      console.log(`Tutorial "${tutorialInfo.title}" was created`);
      //After that, it takes the oldest tutorial in home/latestTutorials and replaces it with the new one
      const root = event.data.ref.root;
      return root.child('home/latestTutorials')
        .orderByChild("publishedDate")
        .limitToFirst(1)
        .once('child_added', (snapshot) => {
          return snapshot.ref.update(tutorialInfo);
        });
    }).then(() => {
      console.log(`Tutorial "${tutorialInfo.title}" was added to latestTutorials`);

      //Add 1 to tutorialCount
      const tutorialCountPromise = admin.database().ref('dashboard/overview/tutorialCount').transaction(number => {
        return number + 1;
      });

      //Add notification
      const notification = {
        title: `New tutorial: ${tutorialInfo.title}`,
        body: tutorialInfo.shortDescription,
        icon: "/images/manifest/icon-72x72.png",
        click_action: `https://alejo.st/tutorial/${tutorialInfo.seriesSlug}/${tutorialInfo.slug}`,
        publishedDate: admin.database.ServerValue.TIMESTAMP
      };
      const notificationPromise = admin.database().ref('dashboard/notifications').push(notification);

      return Promise.all([tutorialCountPromise, notificationPromise]).then(function(values) {
        console.log(`Notification added for "${tutorialInfo.title}".`);
      });
    });
  }
);

exports.addWork = onValueWritten(
  { ref: '/works/{workSlug}', instance: DB_INSTANCE },
  (event) => {
    const workSlug = event.params.workSlug;

    // On delete
    if (!event.data.after.exists()) {
      // Remove contents of storage folder to save space
      const bucket = gcs.bucket("alejost848-afea9.appspot.com");
      return bucket.deleteFiles({ prefix: `works/${workSlug}` })
        .then(() => {
          console.log(`Work "${workSlug}" deleted.`);
          //Remove 1 from workCount
          return admin.database().ref('dashboard/overview/workCount').transaction(number => {
            return number - 1;
          });
        });
    }

    // On create
    if (!event.data.before.exists()) {
      //Add new stuff from the paper-chips to the database for autocompleteSuggestions
      const work = event.data.after.val();
      const autocompletePromise = admin.database().ref('dashboard/autocompleteSuggestions').update(getUpdatedObject(work));
      //Add 1 to workCount
      const workCountPromise = admin.database().ref('dashboard/overview/workCount').transaction(number => {
        return number + 1;
      });

      // Compress cover and generate thumbnail
      const coverImagePromise = handleCoverImage(workSlug, work);

      //Add notification
      const notification = {
        title: `New work: ${work.title}`,
        body: work.shortDescription,
        icon: "/images/manifest/icon-72x72.png",
  	    click_action: `https://alejo.st/work/${workSlug}`,
        publishedDate: admin.database.ServerValue.TIMESTAMP
      };
      const notificationPromise = admin.database().ref('dashboard/notifications').push(notification);

      return Promise.all([autocompletePromise, workCountPromise, notificationPromise, coverImagePromise]).then(function(values) {
        console.log(`"${workSlug}" processing completed.`);
      });
    }

    //On edit
    if (event.data.before.exists()) {
      //Add new stuff from the paper-chips to the database for autocompleteSuggestions
      const work = event.data.after.val();
      const autocompletePromise = admin.database().ref('dashboard/autocompleteSuggestions').update(getUpdatedObject(work));

      // Compress cover and generate thumbnail
      const coverImagePromise = handleCoverImage(workSlug, work);

      return Promise.all([autocompletePromise, coverImagePromise]).then(function(values) {
        console.log(`"${workSlug}" is ready to see.`);
      });
    }
  }
);

function handleCoverImage(workSlug, work) {
  const JPEG_EXTENSION = '.jpg';

  const bucket = gcs.bucket("alejost848-afea9.appspot.com");

  // Exit if there's no cover image
  if (!work.coverImage) {
    return null;
  }

  const coverPath = work.coverImage.path;
  const coverDirectory = path.dirname(coverPath);
  const coverNameOnly = path.basename(coverPath, path.extname(coverPath));

  // Exit if the image is already compressed
  if (coverNameOnly.startsWith('compressed_')) {
    return null;
  }

  const compressedCoverPath = path.normalize(path.format({dir: coverDirectory, name: `compressed_${coverNameOnly}`, ext: JPEG_EXTENSION})); // Compressed image path
  const thumbnailPath = path.join(coverDirectory, `thumb_${coverNameOnly}${JPEG_EXTENSION}`); // Thumbnail image path

  const tempCoverPath = path.join(os.tmpdir(), coverPath); // Temporary local file
  const tempLocalDir = path.dirname(tempCoverPath);
  const tempCompressedCoverPath = path.join(os.tmpdir(), compressedCoverPath); // Temporary JPEG file
  const tempThumbnailPath = path.join(os.tmpdir(), thumbnailPath); // Temporary JPEG file

  // Create the temp directory where the storage file will be downloaded.
  return fs.promises.mkdir(tempLocalDir, { recursive: true }).then(() => {
    // Download file from bucket.
    return bucket.file(coverPath).download({ destination: tempCoverPath });
  }).then(() => {
    console.log('Image downloaded locally to', tempCoverPath);
    // Convert image to JPEG with lower quality to reduce file size
    return execFile('convert', [tempCoverPath, '-strip', '-quality', '80', tempCompressedCoverPath]);
  }).then(() => {
    console.log('Compressed image created at', tempCoverPath);
    // Upload the compressed image
    return bucket.upload(tempCompressedCoverPath, { destination: compressedCoverPath, metadata: { cacheControl: 'public, max-age=691200' } });
  }).then(() => {
    console.log('Compressed image uploaded to bucket.');
    // Generate the thumbnail
    return execFile('convert', [tempCoverPath, '-thumbnail', '320x180>', tempThumbnailPath]);
  }).then(() => {
    console.log('Thumbnail created at', tempThumbnailPath);
    // Upload the thumbnail.
    return bucket.upload(tempThumbnailPath, { destination: thumbnailPath, metadata: { cacheControl: 'public, max-age=691200' } });
  }).then(() => {
    console.log('Thumbnail uploaded to bucket.');
    // Remove original cover image from bucket
    return bucket.file(coverPath).delete();
  }).then(() => {
    console.log('Original cover removed from bucket.');

    // Delete the local files to free up disk space.
    return Promise.all([
      fs.promises.unlink(tempCoverPath).catch(() => {}),
      fs.promises.unlink(tempCompressedCoverPath).catch(() => {}),
      fs.promises.unlink(tempThumbnailPath).catch(() => {})
    ]);
  }).then(() => {
    // Get the Signed URLs for the compressed cover and thumbnail.
    const config = {
      action: 'read',
      expires: '03-01-2500'
    };

    const getCompressedCoverUrl = bucket.file(compressedCoverPath).getSignedUrl(config);
    const getThumbnailUrl = bucket.file(thumbnailPath).getSignedUrl(config);

    return Promise.all([getCompressedCoverUrl, getThumbnailUrl]);
  }).then((signedUrls) => {
    console.log('Download URLs generated.', signedUrls[0][0], signedUrls[1][0]);
    // Upload the information to the database
    return admin.database().ref(`/works/${workSlug}`).update({
      coverImage: {
        downloadUrl: signedUrls[0][0],
        path: compressedCoverPath
      },
      thumbnail: signedUrls[1][0]
    });
  }).then(() => {
    console.log('Images saved to the database.');
    return null;
  });
}

function getUpdatedObject(work) {
  // HACK: Multi-path updates
  var updateObject = {};
  let items = ["categories", "clients", "credits", "toolsUsed"];
  for (var i = 0; i < items.length; i++) {
    let item = items[i];
    for (var key in work[item]) {
      if (work[item].hasOwnProperty(key)) {
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

    // If we are deleting the user stop doing stuff
    if (!event.data.after.exists()) {
      console.log(`User: ${uid} was removed`);
      return null;
    }

    const userToken = event.data.after.val().token;
    const subscribed = event.data.after.val().subscribed;

    // If token or subscribed values are not present stop
    if (!userToken || typeof subscribed !== 'boolean') {
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
          await subscriptions.transaction(number => (number || 0) + 1);
        }
      } else {
        const response = await admin.messaging().unsubscribeFromTopic(userToken, 'all');
        if (response.errors && response.errors.length > 0) {
          console.error("Errors unsubscribing from topic 'all':", response.errors);
        } else {
          console.log(`User ${uid} successfully unsubscribed from topic 'all'`, response);
          await subscriptions.transaction(number => Math.max(0, (number || 0) - 1));
        }
      }
    } catch (error) {
      console.error("Error managing subscription to topic 'all':", error);
    }
    return null;
  }
);

exports.handleFormSubmit = onRequest({
  cors: true,
  secrets: ['GMAIL_EMAIL', 'GMAIL_PASSWORD']
}, async (req, res) => {
  try {
    const { name, email, subject, message, hp, ts } = req.body || {};

    // 1. Honeypot check: If the hidden honeypot field is filled, silently discard (tarpit spam bots)
    if (hp && typeof hp === 'string' && hp.trim().length > 0) {
      console.warn('Spam bot detected via honeypot field:', hp);
      return res.status(200).json({ success: true, message: 'sent' });
    }

    // 2. Timestamp check: Submissions within < 800ms of page render are likely automated scripts
    if (ts && typeof ts === 'number') {
      const timeElapsed = Date.now() - ts;
      if (timeElapsed < 800) {
        console.warn('Suspiciously fast submission detected (< 800ms):', timeElapsed);
        return res.status(200).json({ success: true, message: 'sent' });
      }
    }

    // 3. Validate required fields
    if (!email || !subject || !message) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // 4. Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(email).trim())) {
      return res.status(400).json({ success: false, message: 'Invalid email address' });
    }

    // 5. Read email template and dispatch email
    const templateContent = await fs.promises.readFile(path.join(__dirname, 'email.html'), 'utf8');
    const template = handlebars.compile(templateContent);
    const replacements = {
      name: name ? String(name).trim() : 'Anonymous',
      email: String(email).trim(),
      subject: String(subject).trim(),
      message: String(message).trim()
    };
    const htmlToSend = template(replacements);

    const gmailEmail = process.env.GMAIL_EMAIL;
    const gmailPassword = process.env.GMAIL_PASSWORD;

    const mailTransport = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailEmail,
        pass: gmailPassword
      }
    });

    const mailOptions = {
      from: `"${replacements.name}" <${gmailEmail}>`,
      replyTo: replacements.email,
      to: gmailEmail,
      subject: `[alejo.st] ${replacements.subject}`,
      html: htmlToSend
    };

    await mailTransport.sendMail(mailOptions);
    console.log('Contact form email sent successfully for:', replacements.email);

    return res.status(200).json({ success: true, message: 'sent' });
  } catch (reason) {
    console.error('Error handling form submit:', reason);
    return res.status(500).json({ success: false, message: 'Server error sending email', error: String(reason) });
  }
});


exports.handleImagesDeletion = onObjectDeleted((event) => {

  const fileBucket = event.data.bucket; // The Storage bucket that contains the file.
  const bucket = gcs.bucket(fileBucket);
  const filePath = event.data.name; // File path in the bucket.
  const directoryName = path.dirname(filePath); // Get the directory name.
  const fileName = path.basename(filePath); // Get the file name.

  // If the compressed image is deleted, delete the thumbnail too by removing the cover folder
  if (fileName.startsWith('compressed_')) {
    return bucket.deleteFiles({ prefix: directoryName })
      .then(() => {
        console.log('Cover folder deleted.');
      });
  }
});

const BOT_USER_AGENTS = [
  'googlebot',
  'bingbot',
  'yandex',
  'baiduspider',
  'facebookexternalhit',
  'twitterbot',
  'rogerbot',
  'linkedinbot',
  'embedly',
  'quora link preview',
  'showyoubot',
  'outbrain',
  'pinterest',
  'slackbot',
  'vkshare',
  'w3c_validator',
  'whatsapp',
  'telegrambot',
  'discordbot',
  'applebot'
];

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

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function injectMetaIntoHtml(html, tags) {
  let modified = html;

  if (tags.title) {
    modified = modified.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(tags.title)}</title>`);
  }

  const metaElements = [];
  if (tags.description) {
    metaElements.push(`<meta name="description" content="${escapeHtml(tags.description)}" />`);
  }
  if (tags['og:title']) {
    metaElements.push(`<meta property="og:title" content="${escapeHtml(tags['og:title'])}" />`);
  }
  if (tags['og:description']) {
    metaElements.push(`<meta property="og:description" content="${escapeHtml(tags['og:description'])}" />`);
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
  }
  metaElements.push(`<meta name="twitter:card" content="summary_large_image" />`);
  metaElements.push(`<meta name="twitter:site" content="@alejost848" />`);

  // Remove previous description and og meta tags to prevent duplication
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
  'og:image': 'https://alejo.st/images/cover.png',
};

async function getMetadataForRoute(reqPath) {
  const segments = reqPath.split('/').filter(Boolean);
  const view = segments[0];

  if (view === 'work' && segments[1]) {
    const slug = segments[1];
    try {
      const snap = await Promise.race([
        admin.database().ref(`works/${slug}`).once('value'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2500))
      ]);
      const item = snap.val();
      if (item) {
        return {
          title: `${item.title} - Alejandro Sanclemente`,
          'og:title': `${item.title} - Alejandro Sanclemente`,
          description: item.shortDescription || item.description || DEFAULT_METADATA.description,
          'og:description': item.shortDescription || item.description || DEFAULT_METADATA.description,
          'og:type': 'article',
          'og:image': item.videoId ? `https://i.ytimg.com/vi/${item.videoId}/maxresdefault.jpg` : (item.coverImage?.downloadUrl || DEFAULT_METADATA['og:image']),
          'og:url': `https://alejo.st${reqPath}`,
        };
      }
    } catch (err) {
      console.warn('Error fetching work metadata:', slug, err.message);
    }
  } else if (view === 'tutorial' && segments[1] && segments[2]) {
    const seriesName = segments[1];
    const tutorialSlug = segments[2];
    try {
      const snap = await Promise.race([
        admin.database().ref(`tutorials/${seriesName}/videos/`).orderByChild('slug').equalTo(tutorialSlug).once('value'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2500))
      ]);
      const val = snap.val();
      if (val) {
        const item = Object.values(val)[0];
        if (item) {
          return {
            title: `${item.title} - Alejandro Sanclemente`,
            'og:title': `${item.title} - Alejandro Sanclemente`,
            description: item.shortDescription || item.description || DEFAULT_METADATA.description,
            'og:description': item.shortDescription || item.description || DEFAULT_METADATA.description,
            'og:type': 'article',
            'og:image': item.videoId ? `https://i.ytimg.com/vi/${item.videoId}/maxresdefault.jpg` : (item.coverImage?.downloadUrl || DEFAULT_METADATA['og:image']),
            'og:url': `https://alejo.st${reqPath}`,
          };
        }
      }
    } catch (err) {
      console.warn('Error fetching tutorial metadata:', tutorialSlug, err.message);
    }
  }

  return {
    ...DEFAULT_METADATA,
    'og:url': `https://alejo.st${reqPath}`,
  };
}

exports.host = onRequest(async (req, res) => {
  const baseHtml = getIndexHtmlTemplate();

  // Edge cache for 1 hour, browser for 5 minutes
  res.set('Cache-Control', 'public, max-age=300, s-maxage=3600');

  const segments = req.path.split('/').filter(Boolean);
  const isSingleView = segments[0] === 'work' || segments[0] === 'tutorial';

  if (!isSingleView) {
    return res.status(200).type('html').send(baseHtml);
  }

  try {
    const tags = await getMetadataForRoute(req.path);
    const renderedHtml = injectMetaIntoHtml(baseHtml, tags);
    return res.status(200).type('html').send(renderedHtml);
  } catch (error) {
    console.error('Error in host function:', error);
    return res.status(200).type('html').send(baseHtml);
  }
});
