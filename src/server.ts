import express, { json } from 'express'
import cors from 'cors'
import morgan from 'morgan'
import { corsConfig } from './config/cors'
import { connectDB } from './config/db'
import authRoutes from './routes/authRoutes'
import llmRoutes from './routes/llmRoutes'
import generateDeepSeek from './routes/generateDeepSeek'
import contentRoutes from './routes/contentRoutes'
import adminSubjectRoutes from './routes/admin/subjectRoutes'
import adminUsersRoutes from './routes/admin/userRoutes'
import adminTopicRoutes from './routes/admin/topicRoutes'
import adminSubtopicRoutes from './routes/admin/subtopicRoutes'


connectDB()

const app = express()
app.use(cors(corsConfig))

app.use(morgan('dev'))

app.use(express.json())

//Routes
app.use('/api/auth', authRoutes)
app.use('/api/llm', llmRoutes)
app.use('/api/content', contentRoutes)
app.use('/api/admin/subjects', adminSubjectRoutes)
app.use('/api/admin/users', adminUsersRoutes)
app.use('/api/admin/topics', adminTopicRoutes)
app.use('/api/admin/subtopics', adminSubtopicRoutes)

export default app