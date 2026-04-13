# scriptops-panel
> A centralized web panel for managing user scripts, remote servers, and access control.  
> The project is under active development.

## What's unique?
The system unifies the full lifecycle of scripts in a single interface: creation, distribution, deployment, execution, monitoring, renewal, freezing, and access management.  
The backend supports remote management via SSH/PM2, task queues, a scheduler, and real-time state updates via WebSocket.

## What technologies are used?
> [!WARNING]
> Below are the key technologies and infrastructure dependencies of the project.

### Frontend (`client`)
* **React + TypeScript**
* **Vite**
* **Tailwind CSS**
* **Zustand**
* **React Hook Form + Zod**
* **Axios**
* **Socket.IO Client**
* **Chart.js + react-chartjs-2**

### Backend (`server`)
* **NestJS**
* **Prisma + MySQL**
* **JWT + Passport**
* **Bull + Redis**
* **Socket.IO**
* **node-ssh**
* **Winston**

## Why this architecture?
Separation into `client` and `server` allows the UI and API to be scaled independently, avoids mixing responsibilities between layers, and simplifies feature development.  
A modular backend (auth/users/scripts/admin/news/ssh/common) makes the system predictable to maintain and safe to extend.

## How can I run it locally?

### 1) Clone repository
```bash
git clone https://github.com/pluxragex/scriptops-panel.git
cd scriptops-panel
```

### 2) Install dependencies
```bash
cd client && npm install
cd ../server && npm install
```

### 3) Configure environment
```bash
cd server
cp .env.example .env
```

Fill in the required variables in the `.env` file (including `DATABASE_URL`, JWT secrets, frontend URL, script paths, etc.).

### 4) Prepare database
```bash
cd server
npx prisma generate
npx prisma migrate dev
# optional:
# npm run prisma:seed
```

### 5) Start development mode

```bash
# frontend
cd client
npm run dev
```

```bash
# backend
cd server
npm run start:dev
```

## Available functionality

### Authentication & access
* User registration and login
* JWT sessions and refresh mechanism
* Roles: `USER`, `ADMIN`, `SUPER_ADMIN`
* Telegram login / Telegram ID login
* Pending login / pending actions (confirmation of sensitive actions)
* Protected routes and guards

### Scripts management
* Creating and editing scripts
* Linking scripts to a server
* Status control (`RUNNING`, `STOPPED`, `ERROR`, `EXPIRED`, ...)
* Start / stop / restart
* Deployment (upload, git pull, manual)
* Managing expiration time, renewal, freezing
* Script settings (including specialized env/settings blocks)
* Granular user access to scripts

### Servers & infrastructure
* Remote server management
* SSH auth support (key/password)
* Server key management
* SSH connection checks
* Integration with PM2 processes

### Admin panel
* User management
* Server and key management
* Scripts and permissions management
* Scheduler (`ScheduledTask`) and manual task execution
* Viewing statistics and queues
* Audit logs of actions
* News management

### Realtime & observability
* WebSocket status updates
* Background operation queues
* Deployment history and task execution tracking
* System health-check endpoints
* Metrics/charts in the interface

## Testing & quality

### Frontend
```bash
cd client
npm run lint
npm run test
npm run test:coverage
```

### Backend
```bash
cd server
npm run lint
npm run test
npm run test:e2e
npm run test:cov
```

## Project structure
```text
client/   # React + Vite + TypeScript frontend
server/   # NestJS + Prisma backend API
```

## Notes
> [!NOTE]
> The project is designed to work with external services and environments (MySQL, Redis, SSH hosts).  
> To run it locally correctly, make sure the infrastructure and environment variables are prepared in advance.
