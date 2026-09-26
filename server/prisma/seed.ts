import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
    console.log("Starting database seed...");

    // ------------------------------------------------------------
    // CLEAR EXISTING DATA
    // ------------------------------------------------------------

    await prisma.notification.deleteMany();
    await prisma.activityLog.deleteMany();
    await prisma.task.deleteMany();
    await prisma.project.deleteMany();
    await prisma.client.deleteMany();
    await prisma.user.deleteMany();

    console.log("Existing data cleared.");

    // ------------------------------------------------------------
    // PASSWORDS
    // ------------------------------------------------------------

    const adminPassword = await bcrypt.hash("Admin@123", 10);
    const pmPassword = await bcrypt.hash("PM@123", 10);
    const developerPassword = await bcrypt.hash("Dev@123", 10);

    // ------------------------------------------------------------
    // USERS
    // 1 ADMIN
    // 2 PROJECT MANAGERS
    // 4 DEVELOPERS
    // ------------------------------------------------------------

    const admin = await prisma.user.create({
        data: {
            name: "Admin User",
            email: "admin@velozity.com",
            password: adminPassword,
            role: "ADMIN",
        },
    });

    const pm1 = await prisma.user.create({
        data: {
            name: "Sarah Project Manager",
            email: "sarah.pm@velozity.com",
            password: pmPassword,
            role: "PROJECT_MANAGER",
        },
    });

    const pm2 = await prisma.user.create({
        data: {
            name: "Michael Project Manager",
            email: "michael.pm@velozity.com",
            password: pmPassword,
            role: "PROJECT_MANAGER",
        },
    });

    const dev1 = await prisma.user.create({
        data: {
            name: "John Developer",
            email: "john@velozity.com",
            password: developerPassword,
            role: "DEVELOPER",
        },
    });

    const dev2 = await prisma.user.create({
        data: {
            name: "Priya Developer",
            email: "priya@velozity.com",
            password: developerPassword,
            role: "DEVELOPER",
        },
    });

    const dev3 = await prisma.user.create({
        data: {
            name: "Arun Developer",
            email: "arun@velozity.com",
            password: developerPassword,
            role: "DEVELOPER",
        },
    });

    const dev4 = await prisma.user.create({
        data: {
            name: "David Developer",
            email: "david@velozity.com",
            password: developerPassword,
            role: "DEVELOPER",
        },
    });

    console.log("Users created.");

    // ------------------------------------------------------------
    // CLIENTS
    // ------------------------------------------------------------

    const client1 = await prisma.client.create({
        data: {
            name: "ABC Technologies",
            email: "contact@abctech.com",
        },
    });

    const client2 = await prisma.client.create({
        data: {
            name: "Nova Solutions",
            email: "contact@novasolutions.com",
        },
    });

    const client3 = await prisma.client.create({
        data: {
            name: "Future Labs",
            email: "contact@futurelabs.com",
        },
    });

    // ------------------------------------------------------------
    // PROJECTS
    // 2 PROJECTS -> PM1
    // 1 PROJECT -> PM2
    // ------------------------------------------------------------

    const project1 = await prisma.project.create({
        data: {
            name: "Velozity Website",
            description: "Corporate website development project.",
            clientId: client1.id,
            createdById: pm1.id,
        },
    });

    const project2 = await prisma.project.create({
        data: {
            name: "Customer Analytics Platform",
            description: "Analytics dashboard for customer insights.",
            clientId: client2.id,
            createdById: pm1.id,
        },
    });

    const project3 = await prisma.project.create({
        data: {
            name: "Mobile Application",
            description: "Cross-platform mobile application.",
            clientId: client3.id,
            createdById: pm2.id,
        },
    });

    console.log("Projects created.");

    // ------------------------------------------------------------
    // DATES
    // ------------------------------------------------------------

    const now = new Date();

    const overdueDate1 = new Date();
    overdueDate1.setDate(overdueDate1.getDate() - 5);

    const overdueDate2 = new Date();
    overdueDate2.setDate(overdueDate2.getDate() - 2);

    const futureDate1 = new Date();
    futureDate1.setDate(futureDate1.getDate() + 3);

    const futureDate2 = new Date();
    futureDate2.setDate(futureDate2.getDate() + 7);

    const futureDate3 = new Date();
    futureDate3.setDate(futureDate3.getDate() + 10);

    const futureDate4 = new Date();
    futureDate4.setDate(futureDate4.getDate() + 14);

    // ------------------------------------------------------------
    // PROJECT 1 TASKS
    // ------------------------------------------------------------

    const task1 = await prisma.task.create({
        data: {
            title: "Design landing page",
            description: "Create responsive landing page UI.",
            projectId: project1.id,
            assignedDeveloperId: dev1.id,
            status: "DONE",
            priority: "HIGH",
            dueDate: futureDate1,
        },
    });

    const task2 = await prisma.task.create({
        data: {
            title: "Implement authentication",
            description: "Implement secure login and authentication.",
            projectId: project1.id,
            assignedDeveloperId: dev2.id,
            status: "IN_PROGRESS",
            priority: "CRITICAL",
            dueDate: futureDate2,
        },
    });

    const task3 = await prisma.task.create({
        data: {
            title: "Build project dashboard",
            description: "Develop dashboard components.",
            projectId: project1.id,
            assignedDeveloperId: dev3.id,
            status: "IN_REVIEW",
            priority: "HIGH",
            dueDate: futureDate3,
        },
    });

    const task4 = await prisma.task.create({
        data: {
            title: "API integration",
            description: "Connect frontend with backend APIs.",
            projectId: project1.id,
            assignedDeveloperId: dev4.id,
            status: "TODO",
            priority: "MEDIUM",
            dueDate: futureDate4,
        },
    });

    const task5 = await prisma.task.create({
        data: {
            title: "Testing and bug fixing",
            description: "Perform functional testing and fix bugs.",
            projectId: project1.id,
            assignedDeveloperId: dev1.id,
            status: "OVERDUE",
            priority: "HIGH",
            dueDate: overdueDate1,
        },
    });

    // ------------------------------------------------------------
    // PROJECT 2 TASKS
    // ------------------------------------------------------------

    const task6 = await prisma.task.create({
        data: {
            title: "Analytics database design",
            description: "Design database schema for analytics.",
            projectId: project2.id,
            assignedDeveloperId: dev2.id,
            status: "DONE",
            priority: "HIGH",
            dueDate: futureDate1,
        },
    });

    const task7 = await prisma.task.create({
        data: {
            title: "Customer data API",
            description: "Create APIs for customer analytics.",
            projectId: project2.id,
            assignedDeveloperId: dev3.id,
            status: "IN_PROGRESS",
            priority: "CRITICAL",
            dueDate: futureDate2,
        },
    });

    const task8 = await prisma.task.create({
        data: {
            title: "Charts and visualizations",
            description: "Implement analytics charts.",
            projectId: project2.id,
            assignedDeveloperId: dev4.id,
            status: "IN_REVIEW",
            priority: "MEDIUM",
            dueDate: futureDate3,
        },
    });

    const task9 = await prisma.task.create({
        data: {
            title: "Export reports",
            description: "Implement CSV and PDF report export.",
            projectId: project2.id,
            assignedDeveloperId: dev1.id,
            status: "TODO",
            priority: "LOW",
            dueDate: futureDate4,
        },
    });

    const task10 = await prisma.task.create({
        data: {
            title: "Fix analytics bugs",
            description: "Resolve reported analytics issues.",
            projectId: project2.id,
            assignedDeveloperId: dev2.id,
            status: "OVERDUE",
            priority: "HIGH",
            dueDate: overdueDate2,
        },
    });

    // ------------------------------------------------------------
    // PROJECT 3 TASKS
    // ------------------------------------------------------------

    const task11 = await prisma.task.create({
        data: {
            title: "Mobile UI design",
            description: "Create mobile application UI.",
            projectId: project3.id,
            assignedDeveloperId: dev3.id,
            status: "DONE",
            priority: "HIGH",
            dueDate: futureDate1,
        },
    });

    const task12 = await prisma.task.create({
        data: {
            title: "Mobile authentication",
            description: "Implement mobile authentication flow.",
            projectId: project3.id,
            assignedDeveloperId: dev4.id,
            status: "IN_PROGRESS",
            priority: "CRITICAL",
            dueDate: futureDate2,
        },
    });

    const task13 = await prisma.task.create({
        data: {
            title: "Push notifications",
            description: "Implement push notification support.",
            projectId: project3.id,
            assignedDeveloperId: dev1.id,
            status: "TODO",
            priority: "MEDIUM",
            dueDate: futureDate3,
        },
    });

    const task14 = await prisma.task.create({
        data: {
            title: "Mobile API integration",
            description: "Integrate mobile app with backend APIs.",
            projectId: project3.id,
            assignedDeveloperId: dev2.id,
            status: "IN_REVIEW",
            priority: "HIGH",
            dueDate: futureDate4,
        },
    });

    const task15 = await prisma.task.create({
        data: {
            title: "Release testing",
            description: "Perform final release testing.",
            projectId: project3.id,
            assignedDeveloperId: dev3.id,
            status: "TODO",
            priority: "MEDIUM",
            dueDate: futureDate4,
        },
    });

    console.log("15 tasks created.");

    // ------------------------------------------------------------
    // ACTIVITY LOGS
    // ------------------------------------------------------------

    await prisma.activityLog.createMany({
        data: [
            {
                taskId: task1.id,
                userId: dev1.id,
                fromStatus: "TODO",
                toStatus: "IN_PROGRESS",
            },
            {
                taskId: task1.id,
                userId: dev1.id,
                fromStatus: "IN_PROGRESS",
                toStatus: "DONE",
            },
            {
                taskId: task2.id,
                userId: dev2.id,
                fromStatus: "TODO",
                toStatus: "IN_PROGRESS",
            },
            {
                taskId: task3.id,
                userId: dev3.id,
                fromStatus: "IN_PROGRESS",
                toStatus: "IN_REVIEW",
            },
            {
                taskId: task6.id,
                userId: dev2.id,
                fromStatus: "IN_PROGRESS",
                toStatus: "DONE",
            },
            {
                taskId: task7.id,
                userId: dev3.id,
                fromStatus: "TODO",
                toStatus: "IN_PROGRESS",
            },
            {
                taskId: task8.id,
                userId: dev4.id,
                fromStatus: "IN_PROGRESS",
                toStatus: "IN_REVIEW",
            },
            {
                taskId: task11.id,
                userId: dev3.id,
                fromStatus: "IN_PROGRESS",
                toStatus: "DONE",
            },
            {
                taskId: task12.id,
                userId: dev4.id,
                fromStatus: "TODO",
                toStatus: "IN_PROGRESS",
            },
            {
                taskId: task14.id,
                userId: dev2.id,
                fromStatus: "IN_PROGRESS",
                toStatus: "IN_REVIEW",
            },
        ],
    });

    console.log("Activity logs created.");

    // ------------------------------------------------------------
    // NOTIFICATIONS
    // ------------------------------------------------------------

    await prisma.notification.createMany({
        data: [
            {
                userId: dev1.id,
                message: "You have been assigned a new task: Design landing page",
            },
            {
                userId: dev2.id,
                message: "You have been assigned a new task: Implement authentication",
            },
            {
                userId: pm1.id,
                message: "A task has moved to In Review: Build project dashboard",
            },
            {
                userId: pm2.id,
                message: "A task has moved to In Review: Mobile API integration",
            },
        ],
    });

    console.log("Notifications created.");

    console.log("");
    console.log("========================================");
    console.log("DATABASE SEED COMPLETED");
    console.log("========================================");
    console.log("");
    console.log("Admin:");
    console.log("  Email: admin@velozity.com");
    console.log("  Password: Admin@123");
    console.log("");
    console.log("Project Manager 1:");
    console.log("  Email: sarah.pm@velozity.com");
    console.log("  Password: PM@123");
    console.log("");
    console.log("Project Manager 2:");
    console.log("  Email: michael.pm@velozity.com");
    console.log("  Password: PM@123");
    console.log("");
    console.log("Developers:");
    console.log("  john@velozity.com / Dev@123");
    console.log("  priya@velozity.com / Dev@123");
    console.log("  arun@velozity.com / Dev@123");
    console.log("  david@velozity.com / Dev@123");
    console.log("");
    console.log("Projects: 3");
    console.log("Tasks: 15");
    console.log("Overdue tasks: 2");
    console.log("Activity logs: 10");
    console.log("========================================");

    // Prevent unused-variable warning for admin
    void admin;
    void now;
}

main()
    .catch((error) => {
        console.error("Seed failed:", error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });