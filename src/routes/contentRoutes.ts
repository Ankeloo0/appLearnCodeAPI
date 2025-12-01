import { Router } from "express";
import { ContentController } from "../controller/ContentController";
import { authenticate } from "../middleware/auth";

const router = Router()

// -------- Subjects --------
router.get('/getSubjects',
    authenticate,
    ContentController.getSubjects
)

// -------- Topics --------
router.get('/getTopicsBySubject/:subjectId',
    authenticate,
    ContentController.getTopicsBySubject
)

router.post('/createTopic',
    ContentController.createTopic
)

router.put('/updateTopic/:id',
    ContentController.updateTopic
)

router.delete('/deleteTopic/:id',
    ContentController.deleteTopic
)

// -------- Subtopics --------
router.get('/getSubtopicsByTopic/:topicId',
    authenticate,
    ContentController.getSubtopicsByTopic
)

router.get('/getSubtopicDetail/:subtopicId',
    authenticate,
    ContentController.getSubtopicDetail
)

router.post('/createSubtopic',
    ContentController.createSubtopic
)

router.put('/updateSubtopic/:id',
    ContentController.updateSubtopic
)

router.delete('/deleteSubtopic/:id',
    ContentController.deleteSubtopic
)

export default router
