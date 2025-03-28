import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import "./index.css"; // Import CSS file
import { set } from "date-fns";
import '@fortawesome/fontawesome-free/css/all.min.css';

const highlightWords = [
  "break", "dinner", "good morning", "your journey", "lunch", "relaxation",
  "snack", "walking", "good night", "breakfast", "fall in love",
  "stop chasing", "study like", "5-minute rule", "bath", "sleep"
];

// Format time in HH:MM AM/PM format
const formatTime = (date) => {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
};
const getEventClass = (title, duration) => {
  const cleanedTitle = title.toLowerCase();
  if (highlightWords.some(word => cleanedTitle.includes(word))) return "pink-event";
  if (duration < 15) return "small-event";
  return "yellow-event";
};

// Format duration in HH:MM (e.g., "1h 30m")
const formatDuration = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
};

function removeLastParentheses(text) {
  return text.replace(/\s*\([^()]*\)$/, '');
}

// Function to clean event title (remove emojis and duration)
const cleanEventTitle = (title) => {
  return title
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "") // Remove emojis
    .replace(/\s*\(\d+\s*\w+\)\s*$/, "") // Remove (360 min) or similar at the end
    .replace(/-?\d{13}/g, "") // Remove 13-digit timestamp-like numbers (e.g., -1742322600000)
    .replace(/\s*\(\d+h\s*\d*m\)\s*$/, "") // Remove (1h 30m) or similar
    .trim();
};




function removeAfterFirstEmoji(text) {
  // Unicode regex for matching emojis (supports multi-codepoint emojis)
  const emojiRegex = /(\p{Extended_Pictographic}|\p{Emoji_Presentation})+/gu;

  // Find the first emoji match
  let match = emojiRegex.exec(text);

  // If no emoji is found, return the original text
  if (!match) {
    return text;
  }

  // Get the index of the first emoji
  let firstEmojiIndex = match.index;

  // Remove everything from and after the first emoji
  return text.slice(0, firstEmojiIndex);
}

let TimDate = new Date(new Date().setDate(new Date().getDate() + 1))
const Calendar = () => {
  const [events, setEvents] = useState([]);
  const [savingEvent, setSavingEvent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [responseMessage, setResponseMessage] = useState("");
  const [viewMode, setViewMode] = useState("Saved to File"); // Default view mode


  const viewModes = ["Current Events", "Normal Day", "Extra Class Day", "Weekend", "Saved to File"];




  const handleEventDelete = (clickInfo) => {
    const eventId = clickInfo.event.id;
    const eventTitle = clickInfo.event.title;

    if (window.confirm(`Delete event: "${eventTitle}"?`)) {
      setEvents(prevEvents => prevEvents.filter(event => event.id !== eventId));
    }
  };


  const handleEventDoubleClick = (clickInfo) => {
    const eventId = clickInfo.event.id;
    const eventParts = clickInfo.event.title.split(" | ");
    const timeRange = eventParts[0];
    const oldTitleWithDuration = eventParts[1];

    // Extract event name (without duration)
    const oldTitle = cleanEventTitle(oldTitleWithDuration);

    // Create input box
    const input = document.createElement("input");
    input.type = "text";
    input.value = oldTitle;
    Object.assign(input.style, {
      width: "100%",
      border: "none",
      fontSize: "14px",
      padding: "3px",
      outline: "none"
    });

    // Replace event text with input
    clickInfo.el.innerHTML = "";
    clickInfo.el.appendChild(input);
    input.focus();

    // Save new title when user presses "Enter" or loses focus
    const saveNewTitle = () => {
      const newTitle = input.value.trim();
      if (newTitle) {
        setEvents((prevEvents) =>
          prevEvents.map(event =>
            event.id === eventId
              ? {
                ...event,
                title: `${timeRange} | ${newTitle} (${formatDuration(event.extendedProps.duration)})`,
                className: getEventClass(newTitle, event.extendedProps.duration)
              }
              : event
          )
        );
      }
    };

    input.addEventListener("blur", () => {
      saveNewTitle();
      clickInfo.event.setProp("title", `${timeRange} | ${input.value.trim()} (${formatDuration(clickInfo.event.extendedProps.duration)})`);
    });

    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        saveNewTitle();
        input.blur();
      }
    });
  };




  // Function to handle new event creation
  const handleDateSelect = (selectInfo) => {
    const start = selectInfo.start;
    const end = selectInfo.end;

    // Prevent multiple popups
    if (document.getElementById("event-create-popup")) return;

    // Create dark background overlay
    const overlay = document.createElement("div");
    overlay.id = "popup-overlay";
    Object.assign(overlay.style, {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      background: "rgba(0, 0, 0, 0.5)",
      zIndex: 999,
    });

    // Create popup container
    const popup = document.createElement("div");
    popup.id = "event-create-popup";
    Object.assign(popup.style, {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      background: "white",
      width: "90%",
      height: "350px",
      maxWidth: "400px",
      boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.2)",
      borderRadius: "8px",
      zIndex: 1000,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    });

    // Create title
    const title = document.createElement("h3");
    title.innerText = "Enter Event Name";
    Object.assign(title.style, {
      marginBottom: "10px",
      textAlign: "center",
    });

    // Create textarea field
    const textarea = document.createElement("textarea");
    Object.assign(textarea.style, {
      fontSize: "16px",
      padding: "10px",
      border: "1px solid #ccc",
      borderRadius: "5px",
      width: "100%",
      height: "90%",
      resize: "none",
    });

    // Create button container
    const buttonContainer = document.createElement("div");
    Object.assign(buttonContainer.style, {
      marginTop: "15px",
      display: "flex",
      justifyContent: "space-around",
      width: "100%",
    });

    // Create "✔" (Save) button
    const saveButton = document.createElement("button");
    saveButton.innerHTML = "✔ Save";
    Object.assign(saveButton.style, {
      background: "#4CAF50",
      color: "white",
      border: "none",
      cursor: "pointer",
      fontSize: "14px",
      padding: "8px 15px",
      borderRadius: "5px",
    });

    // Create "✖" (Cancel) button
    const cancelButton = document.createElement("button");
    cancelButton.innerHTML = "✖ Cancel";
    Object.assign(cancelButton.style, {
      background: "#f44336",
      color: "white",
      border: "none",
      cursor: "pointer",
      fontSize: "14px",
      padding: "8px 15px",
      borderRadius: "5px",
    });

    // Adjust popup size on small screens
    const adjustPopupSize = () => {
      if (window.innerWidth < 500) {
        popup.style.width = "90%";
        popup.style.padding = "20px";
      } else {
        popup.style.width = "400px";
        popup.style.padding = "40px";
      }
    };

    window.addEventListener("resize", adjustPopupSize);
    adjustPopupSize(); // Initial call

    // Function to save event
    const saveEvent = () => {
      const eventName = textarea.value.trim();
      if (eventName) {
        const duration = Math.round((end - start) / (1000 * 60)); // Duration in minutes
        const formattedTitle = `${formatTime(start)} - ${formatTime(end)} | ${eventName} (${duration}m)`;

        const newEvent = {
          id: `${eventName}-${start.getTime()}`,
          title: formattedTitle,
          start,
          end,
          className: "yellow-event",
        };

        setEvents((prevEvents) => [...prevEvents, newEvent]); // Add new event
      }
      closePopup();
    };

    // Function to close popup
    const closePopup = () => {
      document.body.removeChild(popup);
      document.body.removeChild(overlay);
      window.removeEventListener("resize", adjustPopupSize);
    };

    // Event listeners
    saveButton.addEventListener("click", saveEvent);
    cancelButton.addEventListener("click", closePopup);

    // Append elements
    buttonContainer.appendChild(saveButton);
    buttonContainer.appendChild(cancelButton);
    popup.appendChild(title);
    popup.appendChild(textarea);
    popup.appendChild(buttonContainer);
    document.body.appendChild(overlay);
    document.body.appendChild(popup);
    textarea.focus();
  };



  // Fetch events from API
  useEffect(() => {
    if (viewMode === "Current Events") {
      setLoading(true); // Start loading before API call
      fetch("https://sharishth.pythonanywhere.com/get_events/")
        // fetch("http://localhost:8000/get_events/")
        .then((res) => res.json())
        .then((data) => {
          setLoading(false); // Stop loading after response
          if (data.status === "success" && Array.isArray(data.events)) {
            const parsedEvents = data.events.map(event => {
              const startDate = new Date(event.start);
              const endDate = new Date(event.end);
              const duration = Math.round((endDate - startDate) / (1000 * 60)); // Duration in minutes

              // const cleanedTitle = cleanEventTitle(event.title);
              const cleanedTitle = removeAfterFirstEmoji(event.title);
              const formattedTitle = `${formatTime(startDate)} - ${formatTime(endDate)} | ${cleanedTitle} (${formatDuration(duration)})`;
              const eventClass = highlightWords.some(word => cleanedTitle.toLowerCase().includes(word))
                ? "pink-event"
                : duration < 15
                  ? "small-event"
                  : "yellow-event";

              return {
                title: formattedTitle,
                start: startDate,
                end: endDate,
                id: `${event.title}-${startDate.getTime()}`, // Unique ID fix
                extendedProps: { duration },
                className: eventClass
              };
            });
            TimDate = parsedEvents[0].start
            setEvents(parsedEvents);

          } else {
            console.error("Invalid API response format");
          }
        })
        .catch((err) => {
          setLoading(false); // Stop loading on error
          console.error("Error fetching events:", err);
        });
    } else {
      // Load from file
      const fileMap = {
        "Normal Day": "normalday.txt",
        "Extra Class Day": "extraclassday.txt",
        "Weekend": "weekend.txt",
        "Saved to File": fetchFileContent
      };

      const selectedFile = fileMap[viewMode];
      if (viewMode === "Saved to File") {
        fetchFileContentFromApi()
      } else {
        if (selectedFile) {
          loadEventsFromFile(selectedFile);
        }
      }
    }
  }, [viewMode]);


  const fetchFileContentFromApi = () => {
    setLoading(true); // Start loading before API call
    // return fetch("http://localhost:8000/get-file-content/")
    return fetch("https://sharishth.pythonanywhere.com/get-file-content/")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch file content");
        return res.text();
      })
      .then((text) => {
        processEvents(text);
        setLoading(false); // Stop loading after response
      })
      .catch((err) => {
        console.error("Error fetching file content:", err);
        return null;
      });
  };



  const fetchFileContent = async (fileName) => {
    try {
      const response = await fetch(fileName);
      return await response.text();
    } catch (error) {
      console.error("Error fetching file:", error);
      return null;
    }
  };

  const processEvents = (fileContent) => {
    if (!fileContent) {
      setEvents([]); // Reset if no content
      return;
    }

    const parsedEvents = fileContent
      .split("\n")
      .map(line => line.trim()) // Trim spaces
      .filter(line => line.includes("=")) // Ensure valid format
      .map(line => {
        const parts = line.split("=");
        if (parts.length < 2) return null; // Skip malformed lines

        const timeRange = parts[0].trim().replace(/\s+/g, " "); // Clean spaces
        const cleanedTitle = cleanEventTitle(parts[1].trim()); // Remove extra text

        const timeParts = timeRange.split(" - ");
        if (timeParts.length < 2) return null; // Skip incorrect time formats

        // Convert time to Date objects (Assuming events are on the same day)
        const currentDate = TimDate.toLocaleDateString("en-CA"); // Get today's date
        const startDate = new Date(`${currentDate}T${convertTo24Hour(timeParts[0].trim())}`);
        const endDate = new Date(`${currentDate}T${convertTo24Hour(timeParts[1].trim())}`);
        const duration = Math.round((endDate - startDate) / (1000 * 60)); // Duration in minutes

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          console.error("Invalid date conversion:", { timeRange, startDate, endDate });
          return null;
        }

        const formattedTitle = `${formatTime(startDate)} - ${formatTime(endDate)} | ${cleanedTitle} (${formatDuration(duration)})`;

        const eventClass = highlightWords.some(word => cleanedTitle.toLowerCase().includes(word))
          ? "pink-event"
          : duration < 15
            ? "small-event"
            : "yellow-event";

        return {
          title: formattedTitle,
          start: startDate,
          end: endDate,
          id: `${cleanedTitle}-${startDate.getTime()}`, // Unique ID fix
          extendedProps: { duration },
          className: eventClass
        };
      })
      .filter(event => event !== null); // Remove null values

    // Reset state before updating
    setEvents([]);
    setTimeout(() => setEvents(parsedEvents), 0);
  };

  const loadEventsFromFile = async (fileName) => {
    setLoading(true); // Start loading

    const fileContent = await fetchFileContent(fileName);
    processEvents(fileContent);

    setLoading(false); // Stop loading
  };




  const convertTo24Hour = (time) => {
    const match = time.match(/(\d{1,2}):(\d{2})\s?(AM|PM)/i);
    if (!match) {
      console.error("Invalid time format:", time);
      return "00:00:00"; // Default fallback time to prevent crashes
    }

    let [_, hour, minute, period] = match;
    hour = parseInt(hour, 10);
    minute = parseInt(minute, 10);

    if (period.toLowerCase() === "pm" && hour !== 12) hour += 12;
    if (period.toLowerCase() === "am" && hour === 12) hour = 0;

    return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}:00`;
  };


  const filteredEvents = events.filter(event => {
    if (viewMode === "Current Events") return true;
    if (viewMode === "Normal Day") return event.title.toLowerCase().includes("class");
    if (viewMode === "Extra Class Day") return event.title.toLowerCase().includes("extra");
    if (viewMode === "Weekend") return event.title.toLowerCase().includes("break");
    return true;
  });

  // Handle drag-and-drop event change
  const handleEventChange = (eventChangeInfo) => {
    const updatedEvents = events.map(event => {
      if (event.id === eventChangeInfo.event.id) {
        const start = eventChangeInfo.event.start;
        const end = eventChangeInfo.event.end;
        const duration = Math.round((end - start) / (1000 * 60)); // Convert ms to minutes

        const formattedTitle = `${formatTime(start)} - ${formatTime(end)} | ${removeLastParentheses(cleanEventTitle(event.id))} (${formatDuration(duration)})`;

        return { ...event, start, end, title: formattedTitle, className: getEventClass(event.id, duration) };
      }
      return event;
    });

    setEvents(updatedEvents);
  };

  // Handle resizing of event duration
  const handleEventResize = (resizeInfo) => {
    const updatedEvents = events.map(event => {
      if (event.id === resizeInfo.event.id) {
        const start = resizeInfo.event.start;
        const end = resizeInfo.event.end;
        const duration = Math.round((end - start) / (1000 * 60));

        const formattedTitle = `${formatTime(start)} - ${formatTime(end)} | ${removeLastParentheses(cleanEventTitle(event.id))} (${formatDuration(duration)})`;

        return { ...event, start, end, title: formattedTitle, className: getEventClass(event.id, duration) };
      }
      return event;
    });

    setEvents(updatedEvents);
  };

  const handleEventClick = (clickInfo) => {
    const oldEvent = clickInfo.event;
    const oldEventId = oldEvent.id;

    // Extract event details
    const eventParts = oldEvent.title.split(" | ");
    const timeRange = eventParts[0];
    const oldTitleWithDuration = eventParts[1];

    // Extract event name (without duration)
    const oldTitle = cleanEventTitle(oldTitleWithDuration);
    const start = oldEvent.start;
    const end = oldEvent.end;

    // Prevent multiple popups
    if (document.getElementById("event-edit-popup")) return;

    // Create dark background overlay
    const overlay = document.createElement("div");
    overlay.id = "popup-overlay";
    Object.assign(overlay.style, {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      background: "rgba(0, 0, 0, 0.5)",
      zIndex: 999,
    });

    // Create popup container
    const popup = document.createElement("div");
    popup.id = "event-edit-popup";
    Object.assign(popup.style, {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      background: "white",
      width: "90%",
      height: "350px",
      maxWidth: "400px",
      boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.2)",
      borderRadius: "8px",
      zIndex: 1000,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    });

    // Create title
    const title = document.createElement("h3");
    title.innerText = "Edit Event Name";
    Object.assign(title.style, {
      marginBottom: "10px",
      textAlign: "center",
    });

    // Create textarea field
    const textarea = document.createElement("textarea");
    textarea.value = oldTitle;
    Object.assign(textarea.style, {
      fontSize: "16px",
      padding: "10px",
      border: "1px solid #ccc",
      borderRadius: "5px",
      width: "100%",
      height: "90%",
      resize: "none",
    });

    // Create button container
    const buttonContainer = document.createElement("div");
    Object.assign(buttonContainer.style, {
      marginTop: "15px",
      display: "flex",
      justifyContent: "space-around",
      width: "100%",
    });

    // Create "✔" (Save) button
    const saveButton = document.createElement("button");
    saveButton.innerHTML = "✔ Save";
    Object.assign(saveButton.style, {
      background: "#4CAF50",
      color: "white",
      border: "none",
      cursor: "pointer",
      fontSize: "14px",
      padding: "8px 15px",
      borderRadius: "5px",
    });

    // Create "✖" (Cancel) button
    const cancelButton = document.createElement("button");
    cancelButton.innerHTML = "✖ Cancel";
    Object.assign(cancelButton.style, {
      background: "#f44336",
      color: "white",
      border: "none",
      cursor: "pointer",
      fontSize: "14px",
      padding: "8px 15px",
      borderRadius: "5px",
    });

    // Adjust popup size on small screens
    const adjustPopupSize = () => {
      if (window.innerWidth < 500) {
        popup.style.width = "90%";
        popup.style.padding = "20px";
      } else {
        popup.style.width = "400px";
        popup.style.padding = "40px";
      }
    };

    window.addEventListener("resize", adjustPopupSize);
    adjustPopupSize(); // Initial call

    // Function to save changes
    const saveChanges = () => {
      const newTitle = textarea.value.trim();
      if (newTitle) {
        const duration = Math.round((end - start) / (1000 * 60)); // Duration in minutes
        const formattedTitle = `${formatTime(start)} - ${formatTime(end)} | ${newTitle} (${duration}m)`;
        const newEventId = `${newTitle}-${start.getTime()}`; // Generate new event ID

        // Update event title in FullCalendar
        oldEvent.setProp("title", formattedTitle);

        // Since FullCalendar doesn't allow changing `id` directly, update state
        setEvents((prevEvents) =>
          prevEvents.map((event) =>
            event.id === oldEventId
              ? { ...event, id: newEventId, title: formattedTitle }
              : event
          )
        );

      }
      closePopup();
    };

    // Function to cancel changes
    const cancelChanges = () => {
      closePopup();
    };

    // Function to close popup
    const closePopup = () => {
      document.body.removeChild(popup);
      document.body.removeChild(overlay);
      window.removeEventListener("resize", adjustPopupSize);
    };

    // Event listeners
    saveButton.addEventListener("click", saveChanges);
    cancelButton.addEventListener("click", cancelChanges);

    // Append elements
    buttonContainer.appendChild(saveButton);
    buttonContainer.appendChild(cancelButton);
    popup.appendChild(title);
    popup.appendChild(textarea);
    popup.appendChild(buttonContainer);
    document.body.appendChild(overlay);
    document.body.appendChild(popup);
    textarea.focus();
  };






  const updateFileContent = async () => {
    try {
      setSavingEvent(true);
      const fileContent = events.map(event => {
        const startTime = formatTime(event.start);
        const endTime = formatTime(event.end);
        const eventTitle = removeLastParentheses(cleanEventTitle(event.id));
        return `${startTime} - ${endTime}= ${eventTitle}`;
      }).join("\n");
      // const response = await fetch("http://localhost:8000/update-file-content/", {
      const response = await fetch("https://sharishth.pythonanywhere.com/update-file-content/", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: fileContent
      });

      setSavingEvent(false);
      if (!response.ok) throw new Error("Failed to update file content");
      setResponseMessage("Events saved successfully!");
      setTimeout(() => setResponseMessage(""), 3000);
    } catch (error) {
      console.error("Error updating file content:", error);
    }
  };



  // Save updated events back to API
  const saveEventsToFile = () => {
    const userConfirmed = window.confirm("Are you sure you want to save the changes?");
    if (!userConfirmed) return;

    setSavingEvent(true);

    const timeSlots = events.map(event => {
      const startTime = formatTime(event.start);
      const endTime = formatTime(event.end);
      const duration = (new Date(event.end) - new Date(event.start)) / (1000 * 60);

      // return `${startTime} - ${endTime} = ${event.id} (${formatDuration(duration)})`;
      return `${startTime} - ${endTime} = ${removeLastParentheses(cleanEventTitle(event.id))}`;

    });

    const payload = {
      time_slots: timeSlots
    };


    fetch("https://sharishth.pythonanywhere.com/add-events/", {
      // fetch("http://localhost:8000/add-events/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    })
      .then((response) => response.json())
      .then((data) => {
        setSavingEvent(false);
        setResponseMessage("Events saved successfully!");
        setTimeout(() => setResponseMessage(""), 3000);
      })
      .catch((error) => {
        setSavingEvent(false);
        setResponseMessage("Error saving events. Please try again.");
        console.error("Error saving events:", error);
      });
  };

  return (
    <div className="calendar-container">
      {/* Navigation Bar */}
<div className="navbar">
  {viewModes.map(mode => (
    <button
      key={mode}
      className={`nav-btn ${viewMode === mode ? "active" : ""}`}
      data-short={mode === "Current Events" ? "CE" :
        mode === "Normal Day" ? "ND" :
        mode === "Extra Class Day" ? "ED" :
        mode === "Weekend" ? "We" :
        mode === "Saved to File" ? "File" : mode}
      onClick={() => setViewMode(mode)}
    >
      <i className={`fas ${
        mode === "Current Events" ? "fa-calendar-day" :
        mode === "Normal Day" ? "fa-calendar-check" :
        mode === "Extra Class Day" ? "fa-book-open" :
        mode === "Weekend" ? "fa-umbrella-beach" :
        mode === "Saved to File" ? "fa-file-alt" : "fa-calendar"} icon`}
        style={{marginRight: "8px"}}></i>
      <span>{mode}</span>
    </button>
  ))}
</div>


{/* Button Container */}
<div className="button-container">
  <button onClick={saveEventsToFile} className="save-btn" data-short="">
    <i className="fas fa-upload"></i>
    <span className="button-text">Publish Events</span>

  </button>
  <button onClick={updateFileContent} className="copy-btn" data-short="">
    <i className="fas fa-copy"></i>
    <span className="button-text">Copy Events</span>
  </button>
</div>



      {/* Loading Screens */}
      {savingEvent && (
        <div className="loading-screen">
          <div className="spinner"></div>
          <p>Saving events, please wait...</p>
        </div>
      )}
      {loading && (
        <div className="loading-screen">
          <div className="spinner"></div>
          <p>Loading events, please wait...</p>
        </div>
      )}

      {/* Response Message */}
      {responseMessage && (
        <div className={`response-message ${responseMessage.includes('successfully') ? 'success' : 'error'}`}>
          <p>{responseMessage}</p>
        </div>
      )}

      {/* FullCalendar Component */}
      <FullCalendar
        plugins={[timeGridPlugin, interactionPlugin]}
        initialDate={TimDate}
        initialView="timeGridDay"
        events={events}
        slotMinTime="00:00:00"
        slotMaxTime="23:59:00"
        editable={true}
        eventDrop={handleEventChange}
        eventResize={handleEventResize}
        eventClick={handleEventClick}
        contentHeight="auto"
        selectable={true}
        select={handleDateSelect}
        height="800px"
        snapDuration="00:15:00"

        /* Hide "Today" button */
        headerToolbar={{
          left: 'title',
          center: '',
          right: ''
        }}

        /* Custom event content */
        eventContent={(arg) => {
          const cleanedTitle = arg.event.title.replace(/^\d{1,2}:\d{2} [APMapm]{2} - \d{1,2}:\d{2} [APMapm]{2} \|\s*/, "");
          const durationMs = arg.event.end.getTime() - arg.event.start.getTime();
          const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
          const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

          let durationFormatted = "";
          if (durationHours > 0) durationFormatted += `${durationHours}h`;
          if (durationMinutes > 0) durationFormatted += ` ${durationMinutes}m`;
          if (durationFormatted) durationFormatted = `(${durationFormatted.trim()})`;

          return (
            <div style={{
              fontSize: "14px",
              padding: "3px 6px",
              borderRadius: "4px"
            }}>
              {arg.event.start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - {arg.event.end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} | {cleanEventTitle(cleanedTitle)} {durationFormatted}
            </div>

          );
        }}
        eventDidMount={(info) => {
          info.el.oncontextmenu = (e) => {
            e.preventDefault();
            handleEventDelete(info);
          };
        }}
      />
    </div>
  );

};

export default Calendar;
