# Vercel deployment

Deploy **SparshRana/Medprooooo** as a new Next.js project. Do not import or change charvi52/medpro or the original newpro-hackflux1 deployment.

The repository pins Node 22 and pnpm 11.25.0. vercel.json installs the pinned package manager and runs the build, including the OCR asset preparation step. Keep the repository root as the project root and let Next.js determine the output directory.

The local-first features do not need environment keys. Account backup, family sharing, email monitoring, optional barcode lookup and signed evidence updates remain inactive until separately configured and tested. See .env.example and OPERATIONS.md. Do not copy private credentials from another project.

The site derives its metadata URL from Vercel's production-project hostname. NEXT_PUBLIC_SITE_URL can override it when a custom domain is assigned.

After deployment verify the homepage, /readiness, the fictional demo and local pack entry. Test real accounts and notification delivery separately when those services are configured. No deployment is claimed until Vercel reports Ready and the URL has been checked.
