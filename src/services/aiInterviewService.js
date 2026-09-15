import apiService from "./apiService";

const AI_INTERVIEW_API =
  "/api/student/ai-interview";

const MAX_RESUME_FILE_SIZE =
  5 * 1024 * 1024;

const MAX_RESUME_TEXT_LENGTH = 100000;
const MAX_PROJECTS_LENGTH = 50000;
const MAX_TECHNOLOGIES_LENGTH = 20000;
const MAX_ANSWER_LENGTH = 20000;
const MAX_VIOLATION_DESCRIPTION_LENGTH = 500;

const PROCTORING_VIOLATION_TYPES = [
  "NO_FACE",
  "MULTIPLE_FACES",
  "SECOND_PERSON_DETECTED",
  "PHONE_DETECTED",
  "LOOKING_AWAY",
  "CAMERA_OFF",
  "TAB_SWITCH",
  "FULLSCREEN_EXIT",
  "COPY_PASTE_ATTEMPT",
  "SUSPICIOUS_AUDIO",
];

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

function normalizeOptionalText(
  value,
  maxLength,
  label
) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error(
      `${label} must be text.`
    );
  }

  const text = value.trim();

  if (text.length > maxLength) {
    throw new Error(
      `${label} must not exceed ${maxLength} characters.`
    );
  }

  return text || null;
}

function validateResumeFile(file) {
  if (!file) {
    throw new Error(
      "Select a resume PDF first."
    );
  }

  if (
    typeof file.size !== "number" ||
    typeof file.name !== "string"
  ) {
    throw new Error(
      "The selected resume file is invalid."
    );
  }

  if (file.size <= 0) {
    throw new Error(
      "Resume PDF is empty."
    );
  }

  if (file.size > MAX_RESUME_FILE_SIZE) {
    throw new Error(
      "Resume PDF size must not exceed 5 MB."
    );
  }

  if (
    !file.name
      .toLowerCase()
      .endsWith(".pdf")
  ) {
    throw new Error(
      "Only PDF resume files are allowed."
    );
  }

  if (
    file.type &&
    file.type.toLowerCase() !==
      "application/pdf"
  ) {
    throw new Error(
      "Only PDF resume files are allowed."
    );
  }

  return file;
}

async function getProfile() {
  return apiService.get(
    `${AI_INTERVIEW_API}/profile`
  );
}

async function uploadResume(file) {
  const resumeFile =
    validateResumeFile(file);

  const formData = new FormData();

  formData.append(
    "file",
    resumeFile
  );

  return apiService.request(
    `${AI_INTERVIEW_API}/profile/resume`,
    {
      method: "POST",
      body: formData,
    }
  );
}

async function saveProfile(profileData) {
  if (
    !profileData ||
    typeof profileData !== "object"
  ) {
    throw new Error(
      "Interview profile data is required."
    );
  }

  const resumeText =
    typeof profileData.resumeText ===
    "string"
      ? profileData.resumeText.trim()
      : "";

  if (!resumeText) {
    throw new Error(
      "Resume text is required. Upload a readable resume PDF first."
    );
  }

  if (
    resumeText.length >
    MAX_RESUME_TEXT_LENGTH
  ) {
    throw new Error(
      `Resume text must not exceed ${MAX_RESUME_TEXT_LENGTH} characters.`
    );
  }

  const resumeFileName =
    normalizeOptionalText(
      profileData.resumeFileName,
      255,
      "Resume file name"
    );

  const resumeContentType =
    normalizeOptionalText(
      profileData.resumeContentType,
      100,
      "Resume content type"
    );

  const projects =
    normalizeOptionalText(
      profileData.projects,
      MAX_PROJECTS_LENGTH,
      "Projects"
    );

  const technologies =
    normalizeOptionalText(
      profileData.technologies,
      MAX_TECHNOLOGIES_LENGTH,
      "Technologies"
    );

  return apiService.put(
    `${AI_INTERVIEW_API}/profile`,
    {
      resumeFileName,
      resumeContentType,
      resumeText,
      projects,
      technologies,
    }
  );
}

async function getEligibility() {
  return apiService.get(
    `${AI_INTERVIEW_API}/eligibility`
  );
}

async function prepareInterview(
  mockTestResultId
) {
  const resultId = requireId(
    mockTestResultId,
    "Mock test result ID"
  );

  return apiService.request(
    `${AI_INTERVIEW_API}/prepare/${resultId}`,
    {
      method: "POST",
    }
  );
}

async function startInterview(
  interviewSessionId
) {
  const sessionId = requireId(
    interviewSessionId,
    "Interview session ID"
  );

  return apiService.request(
    `${AI_INTERVIEW_API}/${sessionId}/start`,
    {
      method: "POST",
    }
  );
}

async function getInterview(
  interviewSessionId,
  options = {}
) {
  const sessionId = requireId(
    interviewSessionId,
    "Interview session ID"
  );

  return apiService.get(
    `${AI_INTERVIEW_API}/${sessionId}`,
    options
  );
}

async function saveAnswer(
  interviewSessionId,
  questionId,
  answerText
) {
  const sessionId = requireId(
    interviewSessionId,
    "Interview session ID"
  );

  const interviewQuestionId = requireId(
    questionId,
    "Interview question ID"
  );

  const answer =
    typeof answerText === "string"
      ? answerText.trim()
      : "";

  if (!answer) {
    throw new Error(
      "Interview answer is required."
    );
  }

  if (
    answer.length > MAX_ANSWER_LENGTH
  ) {
    throw new Error(
      `Interview answer must not exceed ${MAX_ANSWER_LENGTH} characters.`
    );
  }

  return apiService.post(
    `${AI_INTERVIEW_API}/${sessionId}/answers`,
    {
      questionId:
        interviewQuestionId,
      answerText: answer,
    }
  );
}

async function reportViolation(
  interviewSessionId,
  violationType,
  description = ""
) {
  const sessionId = requireId(
    interviewSessionId,
    "Interview session ID"
  );

  const normalizedViolation =
    typeof violationType === "string"
      ? violationType.trim().toUpperCase()
      : "";

  if (
    !PROCTORING_VIOLATION_TYPES.includes(
      normalizedViolation
    )
  ) {
    throw new Error(
      "Invalid interview proctoring violation type."
    );
  }

  const normalizedDescription =
    normalizeOptionalText(
      description,
      MAX_VIOLATION_DESCRIPTION_LENGTH,
      "Violation description"
    );

  return apiService.post(
    `${AI_INTERVIEW_API}/${sessionId}/violations`,
    {
      violationType:
        normalizedViolation,
      description:
        normalizedDescription,
    }
  );
}

async function getViolationHistory(
  interviewSessionId,
  options = {}
) {
  const sessionId = requireId(
    interviewSessionId,
    "Interview session ID"
  );

  return apiService.get(
    `${AI_INTERVIEW_API}/${sessionId}/violations`,
    options
  );
}

async function submitInterview(
  interviewSessionId
) {
  const sessionId = requireId(
    interviewSessionId,
    "Interview session ID"
  );

  return apiService.request(
    `${AI_INTERVIEW_API}/${sessionId}/submit`,
    {
      method: "POST",
    }
  );
}

async function getResult(
  interviewSessionId
) {
  const sessionId = requireId(
    interviewSessionId,
    "Interview session ID"
  );

  return apiService.get(
    `${AI_INTERVIEW_API}/${sessionId}/result`
  );
}

const aiInterviewService = {
  getProfile,
  uploadResume,
  saveProfile,
  getEligibility,
  prepareInterview,
  startInterview,
  getInterview,
  saveAnswer,
  reportViolation,
  getViolationHistory,
  submitInterview,
  getResult,
};

export {
  MAX_RESUME_FILE_SIZE,
  PROCTORING_VIOLATION_TYPES,
};

export default aiInterviewService;