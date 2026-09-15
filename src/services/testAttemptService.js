import apiService from "./apiService";

const TEST_API = "/api/student/mock-tests";
const PROCTORING_API = "/api/proctoring";

function requireId(value, label) {
  const id = Number(value);

  if (
    !["string", "number"].includes(typeof value) ||
    !Number.isSafeInteger(id) ||
    id <= 0
  ) {
    throw new Error(
      `${label} must be a positive integer.`
    );
  }

  return id;
}

async function startTest(
  mockTestId,
  selectedSkill = null
) {
  const id = requireId(
    mockTestId,
    "Mock test ID"
  );

  const skill =
    typeof selectedSkill === "string"
      ? selectedSkill.trim()
      : "";

  const body = {
    mockTestId: id,
  };

  if (skill) {
    body.selectedSkill = skill;
  }

  return apiService.post(
    `${TEST_API}/start`,
    body
  );
}

async function getAttempt(
  testAttemptId,
  options = {}
) {
  const id = requireId(
    testAttemptId,
    "Test attempt ID"
  );

  return apiService.get(
    `${TEST_API}/attempts/${id}`,
    options
  );
}

async function saveAnswer(
  testAttemptId,
  questionId,
  selectedOption
) {
  const attemptId = requireId(
    testAttemptId,
    "Test attempt ID"
  );

  const assignedQuestionId = requireId(
    questionId,
    "Question ID"
  );

  return apiService.post(
    `${TEST_API}/attempts/${attemptId}/answers`,
    {
      questionId: assignedQuestionId,
      selectedOption,
    }
  );
}

async function submitTest(
  testAttemptId,
  mockTestId,
  answers = []
) {
  const attemptId = requireId(
    testAttemptId,
    "Test attempt ID"
  );

  const testId = requireId(
    mockTestId,
    "Mock test ID"
  );

  return apiService.post(
    `${TEST_API}/submit`,
    {
      mockTestId: testId,
      testAttemptId: attemptId,
      answers,
    }
  );
}

async function getResult(testAttemptId) {
  const id = requireId(
    testAttemptId,
    "Test attempt ID"
  );

  return apiService.post(
    `${TEST_API}/attempts/${id}/result`
  );
}

async function getStatus(
  testAttemptId,
  options = {}
) {
  const id = requireId(
    testAttemptId,
    "Test attempt ID"
  );

  return apiService.get(
    `${PROCTORING_API}/attempts/${id}/status`,
    options
  );
}

async function reportViolation(
  testAttemptId,
  violationType,
  description = ""
) {
  const id = requireId(
    testAttemptId,
    "Test attempt ID"
  );

  return apiService.post(
    `${PROCTORING_API}/violations`,
    {
      testAttemptId: id,
      violationType,
      description,
    }
  );
}

const testAttemptService = {
  startTest,
  getAttempt,
  saveAnswer,
  submitTest,
  getResult,
  getStatus,
  reportViolation,
};

export default testAttemptService;