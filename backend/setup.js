import fs from "fs"
import path from "path"
import mysql from "mysql2/promise"
import dotenv from "dotenv"

// Load environment variables
dotenv.config()

async function setupDatabase() {
    console.log("Starting database setup...")

    // Create connection to MySQL server (without database)
    const connection = await mysql.createConnection({
        host: process.env.MYSQL_HOST || "localhost",
        user: process.env.MYSQL_USER || "root",
        password: process.env.MYSQL_PASSWORD || "admin",
        multipleStatements: true, // Important for running multiple SQL statements
    })

    try {
        // Read the schema file
        const schemaPath = path.join(process.cwd(), "database", "schema.sql")
        const schema = fs.readFileSync(schemaPath, "utf8")

        console.log("Executing SQL schema...")

        // Execute the SQL schema
        await connection.query(schema)

        console.log("Database setup completed successfully!")
    } catch (error) {
        console.error("Error setting up database:", error)
    } finally {
        // Close the connection
        await connection.end()
    }
}

// Run the setup function
setupDatabase()

export default setupDatabase
