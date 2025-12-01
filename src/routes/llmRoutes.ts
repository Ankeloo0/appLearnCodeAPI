import { Router } from 'express';
import { LlmController } from '../controller/LlmController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/generate-questions/:subtopicId', 
    authenticate,
    LlmController.generateQuestions
)

router.get('/generate-coding-exercise/:subtopicId',
    authenticate,
    LlmController.generateCodingExercise
)

router.post('/evaluate-code', 
    LlmController.evaluateCode
)

router.post('/generate-hint', 
    LlmController.generateHint
)

router.post('/normalize-content', 
    LlmController.normalizeContent
)

router.post('/generate-variants', 
    LlmController.generateVariants
)

router.post('/chat-tutor',
    authenticate,
    LlmController.chatTutor
)

router.post("/evaluate-exercise/:exerciseId", 
    authenticate, 
    LlmController.evaluateExercise
)


router.post("/evaluate-question/:questionId", 
    authenticate, 
    LlmController.evaluateQuestion
);





export default router;
