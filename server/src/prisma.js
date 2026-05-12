const { PrismaClient } = require("@prisma/client");

function ensureSsl(url) {
	if (!url) return url;
	// If sslmode or ssl param already present, keep as-is
	if (/sslmode=|ssl=true|ssl=false|sslmode%3D/i.test(url)) return url;
	return url + (url.includes('?') ? '&' : '?') + 'sslmode=require';
}

const dbUrl = ensureSsl(process.env.DATABASE_URL || '');

const prisma = new PrismaClient({
	datasources: {
		db: {
			url: dbUrl,
		},
	},
});

module.exports = prisma;
