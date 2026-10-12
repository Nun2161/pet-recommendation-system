"use strict";

(function initializeResetPasswordPage() {
  const ACCOUNT_INFO_ENDPOINT =
  `${window.CATMATCH_API_URL}/auth/password-reset/reset-info`;
 const API_ENDPOINT =
  `${window.CATMATCH_API_URL}/auth/password-reset/reset`;

  const loadingState =
    document.getElementById("resetLoadingState");

  const invalidState =
    document.getElementById("resetInvalidState");

  const invalidMessage =
    document.getElementById("resetInvalidMessage");

  const successState =
    document.getElementById("resetSuccessState");

  const formContent =
    document.getElementById("resetFormContent");

  const form =
    document.getElementById("resetPasswordForm");

  const accountUsername =
  document.getElementById("resetAccountUsername");

  const passwordInput =
    document.getElementById("newPassword");

  const confirmInput =
    document.getElementById("confirmNewPassword");

  const passwordError =
    document.getElementById("newPasswordError");

  const confirmError =
    document.getElementById("confirmPasswordError");

  const messageBox =
    document.getElementById("resetPasswordMessage");

  const submitButton =
    document.getElementById("resetPasswordSubmit");

  const submitLabel =
    submitButton?.querySelector(".submit-label");

  const submitLoading =
    submitButton?.querySelector(".submit-loading");

  const strengthLabel =
    document.getElementById("resetStrengthLabel");

  const strengthBar =
    document.getElementById("resetStrengthBar");

  const params =
    new URLSearchParams(window.location.search);

  /*
   * ระบบใหม่ใช้ Reset Token จาก Backend
   * ไม่ใช้ mode และ oobCode ของ Firebase แล้ว
   */
  const resetToken = String(
    params.get("reset_token") ||
    params.get("token") ||
    ""
  ).trim();

  const commonPasswords = new Set([
    "password",
    "password1",
    "password123",
    "qwerty",
    "qwerty123",
    "123456",
    "123456789",
    "1234567890",
    "abcdefgh",
    "abcdef123",
    "admin123",
    "iloveyou",
    "letmein",
    "welcome",
    "catmatch",
    "password1!",
    "password@1",
    "qwerty123!",
    "admin1234!",
    "catmatch1!",
  ]);

  function showOnly(target) {
    [
      loadingState,
      invalidState,
      successState,
      formContent,
    ].forEach((element) => {
      if (element) {
        element.hidden = element !== target;
      }
    });
  }

  function setFieldError(
    input,
    errorElement,
    message = ""
  ) {
    if (!input || !errorElement) return;

    errorElement.textContent = message;

    input.setAttribute(
      "aria-invalid",
      message ? "true" : "false"
    );

    input.classList.toggle(
      "is-invalid",
      Boolean(message)
    );
  }

  function setMessage(message = "") {
    if (!messageBox) return;

    messageBox.hidden = !message;
    messageBox.textContent = message;
  }

  function setLoading(loading) {
    if (!submitButton) return;

    submitButton.disabled = loading;

    submitButton.setAttribute(
      "aria-busy",
      String(loading)
    );

    if (submitLabel) {
      submitLabel.hidden = loading;
    }

    if (submitLoading) {
      submitLoading.hidden = !loading;
    }
  }

  function normalizeForPasswordCheck(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  }

 function getPasswordRules(value) {
  const normalized =
    normalizeForPasswordCheck(value);

  const isCommon =
    commonPasswords.has(
      String(value || "").toLowerCase()
    ) ||
    commonPasswords.has(normalized) ||
    /(.)\1{3,}/.test(value) ||
    /(123456|abcdef|qwerty|asdfgh|zxcvbn)/i.test(value);

  return {
    length: value.length === 10,
    lowercase: /[a-z]/.test(value),
    uppercase: /[A-Z]/.test(value),
    number: /\d/.test(value),
    special: /[^A-Za-z0-9]/.test(value),
    ascii: /^[\x21-\x7E]+$/.test(value),
    common:
      value.length > 0 &&
      !isCommon,
  };
}
 function passwordErrorMessage(rules) {
  if (!rules.length) {
    return "รหัสผ่านต้องมี 10 ตัวพอดี";
  }

  if (
    !rules.lowercase ||
    !rules.uppercase
  ) {
    return "ต้องมีตัวพิมพ์เล็กและตัวพิมพ์ใหญ่อย่างน้อยอย่างละ 1 ตัว";
  }

  if (
    !rules.number ||
    !rules.special
  ) {
    return "ต้องมีตัวเลขและสัญลักษณ์พิเศษอย่างน้อยอย่างละ 1 ตัว";
  }

  if (!rules.ascii) {
    return "ใช้เฉพาะอักษรอังกฤษ ตัวเลข และสัญลักษณ์ โดยห้ามเว้นวรรค";
  }

  if (!rules.common) {
    return "รหัสผ่านนี้เดาง่ายเกินไป กรุณาใช้รหัสผ่านอื่น";
  }

  return "กรุณาตรวจสอบรหัสผ่านอีกครั้ง";
}

 function updateStrength() {
  const value =
    passwordInput?.value || "";

  const rules =
    getPasswordRules(value);

  const groups = {
    length: rules.length,

    letters:
      rules.lowercase &&
      rules.uppercase,

    numberSpecial:
      rules.number &&
      rules.special,

    /*
     * สองข้อนี้ต้องให้ Backend ตรวจ
     * จึงแสดงเป็นสถานะรอตรวจสอบ
     */
    personal: null,

    common:
      rules.ascii &&
      rules.common,

    history: null,
  };

  Object.entries(groups).forEach(
    ([name, passed]) => {
      const chip =
        document.querySelector(
          `[data-rule="${name}"]`
        );

      if (!chip) return;

      chip.classList.toggle(
        "is-valid",
        passed === true
      );

      chip.classList.toggle(
        "is-invalid",
        passed === false
      );

      chip.classList.toggle(
        "is-pending",
        passed === null
      );
    }
  );

  /*
   * ตรวจในหน้าเว็บได้ 4 ข้อ
   * ส่วนข้อมูลส่วนตัวและประวัติรหัส
   * ให้ Backend ตรวจตอนกดบันทึก
   */
  const localGroups = {
    length: groups.length,
    letters: groups.letters,
    numberSpecial: groups.numberSpecial,
    common: groups.common,
  };

  const passed =
    Object.values(localGroups)
      .filter(Boolean)
      .length;

  const total =
    Object.keys(localGroups).length;

  const ratio =
    passed / total;

  const complete =
    Boolean(value) &&
    passed === total;

  if (strengthBar) {
    strengthBar.style.width =
      `${ratio * 100}%`;

    strengthBar.style.background =
      complete
        ? "#6a9e8f"
        : ratio >= 0.5
          ? "#d7a85f"
          : "#d7736b";
  }

  if (strengthLabel) {
    strengthLabel.textContent =
      !value
        ? "ยังไม่ได้กรอก"
        : complete
          ? "ผ่านเบื้องต้น รอตรวจสอบกับระบบ"
          : `ผ่าน ${passed} จาก ${total} เงื่อนไขเบื้องต้น`;

    strengthLabel.style.color =
      complete
        ? "#4d7c6f"
        : ratio >= 0.5
          ? "#9b722f"
          : "#bf625f";
  }

  return {
    rules,
    complete,
  };
}

  function getServerErrorMessage(data) {
    if (!data) {
      return "ไม่สามารถเปลี่ยนรหัสผ่านได้ กรุณาลองใหม่อีกครั้ง";
    }

   if (
  data.code === "PASSWORD_SIMILAR"
) {
  return (
    "รหัสผ่านใหม่นี้คล้ายกับรหัสผ่านที่เคยใช้มากเกินไป " +
    "กรุณาเปลี่ยนตัวอักษร ตัวเลข และสัญลักษณ์ให้แตกต่างจากเดิมมากขึ้น"
  );
}

if (
  data.code === "PASSWORD_REUSED"
) {
  return (
    "รหัสผ่านนี้เคยถูกใช้งานแล้ว " +
    "กรุณาตั้งรหัสใหม่ที่ไม่ซ้ำกับรหัสปัจจุบันหรือรหัสย้อนหลัง 5 ครั้ง"
  );
}

    if (
      data.code ===
      "PASSWORD_POLICY_ERROR"
    ) {
      if (
        Array.isArray(data.errors) &&
        data.errors.length
      ) {
        return data.errors[0];
      }
    }

    if (
      data.code ===
      "GOOGLE_ACCOUNT_HAS_NO_PASSWORD"
    ) {
      return "บัญชีนี้สมัครผ่าน Google กรุณาเข้าสู่ระบบด้วย Google";
    }

    if (
      data.code ===
      "FIREBASE_ACCOUNT_NOT_LINKED"
    ) {
      return "บัญชีนี้ยังไม่ได้เชื่อมกับ Firebase กรุณาติดต่อผู้ดูแลระบบ";
    }

    return (
      data.message ||
      "ไม่สามารถเปลี่ยนรหัสผ่านได้ กรุณาลองใหม่อีกครั้ง"
    );
  }

  function showInvalidToken(message) {
    if (invalidMessage) {
      invalidMessage.textContent =
        message ||
        "Reset Token ไม่ถูกต้อง หมดอายุ หรือถูกใช้งานแล้ว";
    }

    showOnly(invalidState);
  }

async function prepareResetForm() {
  /*
   * Token ที่ Backend สร้างมีความยาวมากกว่า 30 ตัว
   */
  if (
    resetToken.length < 30 ||
    resetToken.length > 100
  ) {
    showInvalidToken(
      "URL ไม่มี Reset Token หรือ Reset Token ไม่ถูกต้อง"
    );

    return;
  }

  try {
    const response = await fetch(
      `${ACCOUNT_INFO_ENDPOINT}?reset_token=${encodeURIComponent(resetToken)}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    const data = await response
      .json()
      .catch(() => ({}));

    if (!response.ok || data.success === false) {
      showInvalidToken(
        data.message ||
        "Reset Token ไม่ถูกต้อง หมดอายุ หรือถูกใช้งานแล้ว"
      );

      return;
    }

    if (accountUsername) {
      accountUsername.textContent =
        data.username || "ผู้ใช้ CatMatch";
    }

    showOnly(formContent);
    passwordInput?.focus();
  } catch (error) {
    console.error(
      "Load reset account information error:",
      error
    );

    showInvalidToken(
      "ไม่สามารถตรวจสอบข้อมูลบัญชีได้ กรุณาตรวจสอบว่า Backend กำลังทำงาน"
    );
  }
}

  passwordInput?.addEventListener(
    "input",
    () => {
      setFieldError(
        passwordInput,
        passwordError
      );

      setFieldError(
        confirmInput,
        confirmError
      );

      setMessage();
      updateStrength();

      if (confirmInput?.value) {
        setFieldError(
          confirmInput,
          confirmError,
          confirmInput.value ===
            passwordInput.value
            ? ""
            : "รหัสผ่านทั้งสองช่องไม่ตรงกัน"
        );
      }
    }
  );

  confirmInput?.addEventListener(
    "input",
    () => {
      setFieldError(
        confirmInput,
        confirmError
      );

      setMessage();

      if (
        confirmInput.value &&
        confirmInput.value !==
          passwordInput?.value
      ) {
        setFieldError(
          confirmInput,
          confirmError,
          "รหัสผ่านทั้งสองช่องไม่ตรงกัน"
        );
      }
    }
  );

  form?.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      setFieldError(
        passwordInput,
        passwordError
      );

      setFieldError(
        confirmInput,
        confirmError
      );

      setMessage();

      const password =
        passwordInput?.value || "";

      const confirmation =
        confirmInput?.value || "";

      const {
        rules,
        complete,
      } = updateStrength();

      let firstInvalid = null;

      if (!password) {
        setFieldError(
          passwordInput,
          passwordError,
          "กรุณากรอกรหัสผ่านใหม่"
        );

        firstInvalid =
          passwordInput;
      } else if (!complete) {
        setFieldError(
          passwordInput,
          passwordError,
          passwordErrorMessage(rules)
        );

        firstInvalid =
          passwordInput;
      }

      if (!confirmation) {
        setFieldError(
          confirmInput,
          confirmError,
          "กรุณากรอกรหัสผ่านใหม่ซ้ำอีกครั้ง"
        );

        firstInvalid ||=
          confirmInput;
      } else if (
        password !== confirmation
      ) {
        setFieldError(
          confirmInput,
          confirmError,
          "รหัสผ่านทั้งสองช่องไม่ตรงกัน"
        );

        firstInvalid ||=
          confirmInput;
      }

      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }

      setLoading(true);

      try {
        const response =
          await fetch(API_ENDPOINT, {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
              Accept:
                "application/json",
            },

            body: JSON.stringify({
              reset_token:
                resetToken,

              new_password:
                password,

              confirm_password:
                confirmation,
            }),
          });

        const data =
          await response
            .json()
            .catch(() => ({}));

        if (!response.ok) {
          const message =
            getServerErrorMessage(data);

         if (
  data.code === "PASSWORD_REUSED" ||
  data.code === "PASSWORD_SIMILAR"
) {
            setFieldError(
              passwordInput,
              passwordError,
              message
            );

            setMessage(message);
            passwordInput?.focus();
            return;
          }

          if (
            data.code ===
            "PASSWORD_POLICY_ERROR"
          ) {
            setFieldError(
              passwordInput,
              passwordError,
              message
            );

            setMessage(message);
            passwordInput?.focus();
            return;
          }

          const tokenInvalid =
            response.status === 400 &&
            (
              String(data.message || "")
                .toLowerCase()
                .includes("token") ||
              !data.code
            );

          if (tokenInvalid) {
            showInvalidToken(message);
            return;
          }

          setMessage(message);
          return;
        }

        form.reset();
        updateStrength();

        /*
         * ลบ Token ออกจาก URL
         * ไม่ให้ผู้ใช้คัดลอกหรือใช้ซ้ำ
         */
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );

        showOnly(successState);
      } catch (error) {
        console.error(
          "Reset password request error:",
          error
        );

        setMessage(
          "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบว่า Backend กำลังทำงาน"
        );
      } finally {
        setLoading(false);
      }
    }
  );

  updateStrength();
  void prepareResetForm();
})();