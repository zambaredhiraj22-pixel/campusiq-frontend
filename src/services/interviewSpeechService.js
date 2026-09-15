let recognition = null;
let listening = false;

let activeUtterance = null;
let activeSpeakResolve = null;

function getRecognitionClass() {
  return (
    window.SpeechRecognition ||
    window.webkitSpeechRecognition ||
    null
  );
}

function isRecognitionSupported() {
  return Boolean(
    getRecognitionClass()
  );
}

function isSpeechSupported() {
  return Boolean(
    window.speechSynthesis &&
    window.SpeechSynthesisUtterance
  );
}

function stopSpeaking() {
  if (
    window.speechSynthesis
  ) {
    window.speechSynthesis.cancel();
  }

  activeUtterance = null;

  if (activeSpeakResolve) {
    activeSpeakResolve(false);
    activeSpeakResolve = null;
  }
}

function findEnglishVoice() {
  if (
    !window.speechSynthesis
  ) {
    return null;
  }

  const voices =
    window.speechSynthesis.getVoices();

  if (
    !Array.isArray(voices) ||
    voices.length === 0
  ) {
    return null;
  }

  return (
    voices.find(
      (voice) =>
        voice.lang
          ?.toLowerCase()
          .startsWith("en-in")
    ) ||
    voices.find(
      (voice) =>
        voice.lang
          ?.toLowerCase()
          .startsWith("en-gb")
    ) ||
    voices.find(
      (voice) =>
        voice.lang
          ?.toLowerCase()
          .startsWith("en-us")
    ) ||
    voices.find(
      (voice) =>
        voice.lang
          ?.toLowerCase()
          .startsWith("en")
    ) ||
    null
  );
}

function speak(
  text,
  options = {}
) {
  return new Promise(
    (resolve, reject) => {
      const value =
        typeof text === "string"
          ? text.trim()
          : "";

      if (!value) {
        resolve(false);
        return;
      }

      if (!isSpeechSupported()) {
        reject(
          new Error(
            "Text-to-speech is not supported by this browser."
          )
        );

        return;
      }

      stopSpeaking();

      const utterance =
        new SpeechSynthesisUtterance(
          value
        );

      utterance.lang =
        options.lang ||
        "en-IN";

      utterance.rate =
        Number.isFinite(
          options.rate
        )
          ? options.rate
          : 0.95;

      utterance.pitch =
        Number.isFinite(
          options.pitch
        )
          ? options.pitch
          : 1;

      utterance.volume =
        Number.isFinite(
          options.volume
        )
          ? options.volume
          : 1;

      const voice =
        findEnglishVoice();

      if (voice) {
        utterance.voice =
          voice;
      }

      activeUtterance =
        utterance;

      activeSpeakResolve =
        resolve;

      utterance.onend =
        () => {
          activeUtterance =
            null;

          activeSpeakResolve =
            null;

          resolve(true);
        };

      utterance.onerror =
        (event) => {
          activeUtterance =
            null;

          activeSpeakResolve =
            null;

          reject(
            new Error(
              event?.error ===
                "canceled"
                ? "Speech playback was cancelled."
                : "Unable to play the interview question."
            )
          );
        };

      window.speechSynthesis.speak(
        utterance
      );
    }
  );
}

function startListening({
  lang = "en-IN",
  onInterim,
  onFinal,
  onError,
  onEnd,
} = {}) {
  const RecognitionClass =
    getRecognitionClass();

  if (!RecognitionClass) {
    throw new Error(
      "Speech recognition is not supported by this browser. Use the latest Chrome or Edge."
    );
  }

  if (recognition) {
    try {
      recognition.abort();
    } catch {
    }

    recognition = null;
  }

  const instance =
    new RecognitionClass();

  instance.lang = lang;
  instance.continuous = true;
  instance.interimResults = true;
  instance.maxAlternatives = 1;

  instance.onstart =
    () => {
      listening = true;
    };

  instance.onresult =
    (event) => {
      let finalText = "";
      let interimText = "";

      for (
        let index =
          event.resultIndex;
        index <
        event.results.length;
        index++
      ) {
        const result =
          event.results[index];

        const transcript =
          result?.[0]
            ?.transcript
            ?.trim() || "";

        if (!transcript) {
          continue;
        }

        if (result.isFinal) {
          finalText +=
            `${transcript} `;
        } else {
          interimText +=
            `${transcript} `;
        }
      }

      const finalValue =
        finalText.trim();

      const interimValue =
        interimText.trim();

      if (
        finalValue &&
        typeof onFinal ===
          "function"
      ) {
        onFinal(
          finalValue
        );
      }

      if (
        typeof onInterim ===
        "function"
      ) {
        onInterim(
          interimValue
        );
      }
    };

  instance.onerror =
    (event) => {
      listening = false;

      if (
        typeof onError ===
        "function"
      ) {
        onError(
          event?.error ||
          "speech-recognition-error"
        );
      }
    };

  instance.onend =
    () => {
      listening = false;

      if (
        recognition ===
        instance
      ) {
        recognition = null;
      }

      if (
        typeof onEnd ===
        "function"
      ) {
        onEnd();
      }
    };

  recognition = instance;

  try {
    instance.start();
  } catch (error) {
    recognition = null;
    listening = false;

    throw error;
  }
}

function stopListening() {
  if (!recognition) {
    listening = false;
    return;
  }

  try {
    recognition.stop();
  } catch {
  }
}

function cancelListening() {
  if (!recognition) {
    listening = false;
    return;
  }

  try {
    recognition.abort();
  } catch {
  }

  recognition = null;
  listening = false;
}

function isListening() {
  return listening;
}

function close() {
  cancelListening();
  stopSpeaking();
}

const interviewSpeechService = {
  isRecognitionSupported,
  isSpeechSupported,
  speak,
  stopSpeaking,
  startListening,
  stopListening,
  cancelListening,
  isListening,
  close,
};

export default interviewSpeechService;