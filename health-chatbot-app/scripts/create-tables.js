const { Client, Databases, Permission, Role, Storage, ID } = require('node-appwrite');

const client = new Client()
    .setEndpoint('https://nyc.cloud.appwrite.io/v1')
    .setProject('69370a87002fd794bb2c'); // Project ID

const databases = new Databases(client);
const storage = new Storage(client);

// Database ID used in the application
const DB_ID = '693718fa0035792b67ac';

const setup = async () => {
    const key = process.env.APPWRITE_API_KEY;
    if (!key) {
        console.error('Error: APPWRITE_API_KEY environment variable is required.');
        process.exit(1);
    }
    client.setKey(key);

    console.log(`Checking Database ${DB_ID}...`);
    try {
        await databases.get(DB_ID);
        console.log('Database exists.');
    } catch (e) {
        console.log('Database does not exist. Creating...');
        try {
            await databases.create(DB_ID, 'Health App DB');
            console.log('Database created.');
        } catch (createErr) {
            console.error('Failed to create database:', createErr.message);
            // It might restrict custom IDs, try name only if fails? But we need this ID.
        }
    }

    // Define Collections
    const collections = [
        {
            id: 'ai_chats',
            name: 'AI Chats',
            attributes: [
                { key: 'title', type: 'string', size: 255, required: true },
                { key: 'messages', type: 'string', size: 1000000, required: true }, // Large JSON
                { key: 'userId', type: 'string', size: 255, required: true },
                { key: 'createdAt', type: 'string', size: 255, required: true }
            ]
        },
        {
            id: 'regional_chats_', // Note the underscore from frontend code
            name: 'Regional Chats',
            attributes: [
                { key: 'title', type: 'string', size: 255, required: true },
                { key: 'messages', type: 'string', size: 1000000, required: true },
                { key: 'userId', type: 'string', size: 255, required: true },
                { key: 'createdAt', type: 'string', size: 255, required: true },
                { key: 'regionId', type: 'integer', required: true },
                { key: 'regionName', type: 'string', size: 255, required: true },
                { key: 'language', type: 'string', size: 50, required: true },
                { key: 'moderatorId', type: 'integer', required: false },
                { key: 'chatType', type: 'string', size: 50, required: true },
                { key: 'activeUsersCount', type: 'integer', required: false }
            ]
        },
        {
            id: 'reports',
            name: 'Reports',
            attributes: [
                { key: 'userId', type: 'string', size: 255, required: true },
                { key: 'fileUrl', type: 'string', size: 2048, required: false },
                { key: 'analysis', type: 'string', size: 100000, required: false }, // JSON
                { key: 'type', type: 'string', size: 50, required: true },
                { key: 'title', type: 'string', size: 255, required: true },
                { key: 'timestamp', type: 'string', size: 255, required: true }, // Frontend sends ISO string
                { key: 'reportId', type: 'integer', required: true },
                { key: 'status', type: 'string', size: 50, required: false, default: 'pending' },
                { key: 'submittedBy', type: 'integer', required: false },
                { key: 'description', type: 'string', size: 5000, required: false },
                { key: 'resolvedBy', type: 'string', size: 255, required: false },
                { key: 'relatedChatId', type: 'string', size: 255, required: false }
            ]
        },
        {
            id: 'search_logs',
            name: 'Search Logs',
            attributes: [
                { key: 'query', type: 'string', size: 2048, required: false },
                { key: 'city', type: 'string', size: 100, required: false },
                { key: 'user_id', type: 'string', size: 255, required: false },
                { key: 'timestamp', type: 'string', size: 255, required: true },
                { key: 'lat', type: 'double', required: false },
                { key: 'lng', type: 'double', required: false }
            ]
        }
    ];

    for (const col of collections) {
        console.log(`\nProcessing Collection: ${col.name} (${col.id})...`);
        try {
            await databases.getCollection(DB_ID, col.id);
            console.log('Collection already exists.');
        } catch (e) {
            console.log('Creating collection...');
            await databases.createCollection(DB_ID, col.id, col.name, [
                Permission.read(Role.any()),
                Permission.write(Role.users()),
                Permission.read(Role.users()),
                Permission.update(Role.users()),
                Permission.delete(Role.users()),
            ]);
        }

        // Create Attributes
        for (const attr of col.attributes) {
            process.stdout.write(`  - Attribute ${attr.key} (${attr.type})... `);
            try {
                if (attr.type === 'string') {
                    await databases.createStringAttribute(DB_ID, col.id, attr.key, attr.size, attr.required, attr.default);
                } else if (attr.type === 'integer') {
                    await databases.createIntegerAttribute(DB_ID, col.id, attr.key, attr.required, 0, 2147483647, attr.default);
                } else if (attr.type === 'boolean') {
                    await databases.createBooleanAttribute(DB_ID, col.id, attr.key, attr.required, attr.default);
                }
                console.log('Created.');
                // Wait a bit because Appwrite attributes are async
                await new Promise(r => setTimeout(r, 200));
            } catch (e) {
                if (e.code === 409) console.log('Exists.');
                else console.log(`Failed: ${e.message}`);
            }
        }

        // Wait for attributes to be processed
        console.log('  Waiting for attributes to be ready...');
        await new Promise(r => setTimeout(r, 2000));
    }

    console.log('\nAttributes processed.');

    // 2. Create Storage Bucket
    console.log("------------------------------------------");
    console.log("Checking Storage Bucket...");

    // Bucket configuration
    const bucketId = 'health-app-storage';
    const bucketName = 'Health App Storage';

    try {
        await storage.getBucket(bucketId);
        console.log(`Bucket "${bucketName}" already exists.`);
    } catch (error) {
        if (error.code === 404) {
            console.log(`Bucket "${bucketName}" not found. Creating...`);
            await storage.createBucket(bucketId, bucketName, 'file', false, true, 20000000); // 20MB limit
            console.log(`Bucket "${bucketName}" created successfully.`);

            // Set Permissions (Any logged-in user can read/write)
            console.log(`Setting permissions for bucket: ${bucketName}...`);
            await storage.updateBucket(
                bucketId,
                bucketName,
                ['read("any")', 'create("users")'], // Permissions
                false,
                true,
                20000000
            );
            console.log(`Bucket permissions set.`);
        } else {
            console.error(`Error checking bucket "${bucketName}":`, error.message);
        }
    }

    console.log("\nSetup Complete!");
};

setup().catch(console.error);
