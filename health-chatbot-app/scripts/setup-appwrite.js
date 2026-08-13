const { Client, Databases, Storage, ID, Permission, Role } = require('node-appwrite');

// User provided API Key from previous turn (unsafe for client, safe for this one-time script)
// API Key: user provided "Secret API Key" earlier, but I should probably ask them to pass it as an ENV or arg.
// Actually, I'll hardcode the project ID but ask for the API Key in the console or env.
// For simplicity, I'll ask the user to run it with: `export APPWRITE_KEY=... && node scripts/setup-appwrite.js` or similar.
// But this is Windows. `set APPWRITE_KEY=...`

const client = new Client()
    .setEndpoint('https://nyc.cloud.appwrite.io/v1')
    .setProject('69370a87002fd794bb2c'); // User's Project ID

const databases = new Databases(client);
const storage = new Storage(client);

const setup = async () => {
    const key = process.env.APPWRITE_API_KEY;
    if (!key) {
        console.error('Please set APPWRITE_API_KEY environment variable.');
        console.log('Usage (PowerShell): $env:APPWRITE_API_KEY="your_secret_key"; node scripts/setup-appwrite.js');
        process.exit(1);
    }
    client.setKey(key);

    console.log('Starting Appwrite Setup...');

    // 1. Create Database
    try {
        await databases.get('health-app-db');
        console.log('Database "health-app-db" already exists.');
    } catch (e) {
        console.log('Creating database "health-app-db"...');
        await databases.create('health-app-db', 'Health App DB');
    }

    // 2. Create Collections
    const collections = [
        { id: 'chats', name: 'Chats' },
        { id: 'messages', name: 'Messages' },
        { id: 'reports', name: 'Reports' }
    ];

    for (const col of collections) {
        try {
            await databases.getCollection('health-app-db', col.id);
            console.log(`Collection "${col.name}" already exists.`);
        } catch (e) {
            console.log(`Creating collection "${col.name}"...`);
            await databases.createCollection('health-app-db', col.id, col.name, [
                Permission.read(Role.any()), // Adjust permissions as needed
                Permission.write(Role.users()),
                Permission.read(Role.users()),
                Permission.update(Role.users()),
                Permission.delete(Role.users()),
            ]);
        }
    }

    // 3. Create Attributes (Schema)
    // Messages
    console.log('Configuring "Messages" schema...');
    const messageAttrs = [
        { key: 'userId', type: 'string', size: 255, required: true },
        { key: 'role', type: 'string', size: 50, required: true }, // 'user' | 'assistant'
        { key: 'content', type: 'string', size: 5000, required: true },
        { key: 'timestamp', type: 'datetime', required: true }
    ];
    for (const attr of messageAttrs) {
        try {
            if (attr.type === 'string') await databases.createStringAttribute('health-app-db', 'messages', attr.key, attr.size, attr.required);
            if (attr.type === 'datetime') await databases.createDatetimeAttribute('health-app-db', 'messages', attr.key, attr.required);
        } catch (e) { /* Ignore if exists */ }
    }

    // Reports
    console.log('Configuring "Reports" schema...');
    const reportAttrs = [
        { key: 'userId', type: 'string', size: 255, required: true },
        { key: 'fileUrl', type: 'string', size: 2048, required: false },
        { key: 'analysis', type: 'string', size: 10000, required: false }, // JSON string
        { key: 'type', type: 'string', size: 50, required: true },
        { key: 'title', type: 'string', size: 255, required: true },
        { key: 'timestamp', type: 'datetime', required: true }
    ];
    for (const attr of reportAttrs) {
        try {
            if (attr.type === 'string') await databases.createStringAttribute('health-app-db', 'reports', attr.key, attr.size, attr.required);
            if (attr.type === 'datetime') await databases.createDatetimeAttribute('health-app-db', 'reports', attr.key, attr.required);
        } catch (e) { /* Ignore if exists */ }
    }

    // 4. Create Storage Bucket
    try {
        await storage.getBucket('health-app-storage');
        console.log('Bucket "health-app-storage" already exists.');
    } catch (e) {
        console.log('Creating bucket "health-app-storage"...');
        await storage.createBucket('health-app-storage', 'Health App Storage', [
            Permission.read(Role.any()),
            Permission.write(Role.users()),
            Permission.read(Role.users()),
            Permission.update(Role.users()),
            Permission.delete(Role.users()),
        ]);
    }

    console.log('Setup Complete!');
};

setup().catch(console.error);
