"use strict";
// public/app.ts
Object.defineProperty(exports, "__esModule", { value: true });
// We store ephemeral data here:
let currentEpicData = null;
let currentFeaturesData = [];
let currentStoriesData = {};
const API_BASE = "/api"; // Cloudflare worker route
function getApiChoice() {
    return document.querySelector('input[name="apiChoice"]:checked')?.value || "google_gemini";
}
async function createEpicOnly() {
    const reqTitle = document.getElementById("reqTitle").value.trim();
    const reqDescription = document.getElementById("reqDescription").value.trim();
    const reqInstructions = document.getElementById("reqInstructions").value.trim();
    if (!reqTitle) {
        showError("Requirement Brief is required.");
        return;
    }
    showSpinner(true, "Generating EPIC...");
    try {
        const res = await fetch(`${API_BASE}/create-epic`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                reqTitle,
                reqDescription,
                reqInstructions,
                apiChoice: getApiChoice()
            })
        });
        const data = await res.json();
        if (!data.success) {
            throw new Error(data.data || "Error generating EPIC");
        }
        currentEpicData = data.data;
        currentFeaturesData = [];
        currentStoriesData = {};
        renderEpic();
        showSuccess("EPIC generated successfully.");
    }
    catch (err) {
        showError(err.message);
    }
    finally {
        showSpinner(false);
    }
}
function renderEpic() {
    const container = document.getElementById("outputContainer");
    if (!currentEpicData?.epic) {
        container.innerHTML = "<p>No EPIC data available.</p>";
        return;
    }
    const e = currentEpicData.epic;
    container.innerHTML = `
    <div class="card mb-3">
      <div class="card-header">
        <strong>EPIC: </strong> ${escapeHtml(e.title)}
      </div>
      <div class="card-body">
        <p><strong>ID:</strong> ${escapeHtml(e.id)}</p>
        <p><strong>Description:</strong> ${escapeHtml(e.description)}</p>
        <!-- etc. -->
      </div>
    </div>
  `;
}
// ... replicate the rest of your logic (create features, create stories, rewrite, etc.) ...
// Utility
function showSpinner(visible, msg = "Loading...") {
    const spinner = document.getElementById("loadingSpinner");
    if (visible) {
        spinner.textContent = msg;
        spinner.style.display = "block";
    }
    else {
        spinner.style.display = "none";
    }
}
function showError(msg) {
    const errDiv = document.getElementById("errorMessage");
    errDiv.textContent = msg;
    errDiv.classList.remove("d-none");
    // Hide success
    document.getElementById("successMessage").classList.add("d-none");
}
function showSuccess(msg) {
    const successDiv = document.getElementById("successMessage");
    successDiv.textContent = msg;
    successDiv.classList.remove("d-none");
    // Hide error
    document.getElementById("errorMessage").classList.add("d-none");
}
function escapeHtml(unsafe) {
    if (!unsafe)
        return "";
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
// Event listeners
document.getElementById("btnCreateEpic")?.addEventListener("click", () => {
    createEpicOnly();
});
document.getElementById("btnCreateEpicFeatures")?.addEventListener("click", () => {
    // call a "createEpicAndFeatures()" function, etc.
});
document.getElementById("btnCreateAll")?.addEventListener("click", () => {
    // call "createEpicFeaturesStories()"
});
