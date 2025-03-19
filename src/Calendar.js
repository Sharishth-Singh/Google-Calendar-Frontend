import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import "./index.css"; // Import CSS file
import { set } from "date-fns";

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
  const [viewMode, setViewMode] = useState("Current Events"); // Default view mode


  const viewModes = ["Current Events", "Normal Day", "Extra Class Day", "Weekend", "Saved to File"];




  const handleEventDelete = (clickInfo) => {
    const eventId = clickInfo.event.id;
    const eventTitle = clickInfo.event.title;

    // Show delete confirmation on right-click
    if (window.confirm(`Delete event: "${eventTitle}"?`)) {
      setEvents(events.filter(event => event.id !== eventId));
    }
  };

  const handleEventDoubleClick = (clickInfo) => {
    const eventId = clickInfo.event.id;
    const eventParts = clickInfo.event.title.split(" | ");
    const timeRange = eventParts[0];
    const oldTitleWithDuration = eventParts[1];

    // Extract event name (without duration)
    const oldTitle = cleanEventTitle(oldTitleWithDuration);

    // Create an input box
    const input = document.createElement("input");
    input.type = "text";
    input.value = oldTitle;
    input.style.width = "100%";
    input.style.border = "none";
    input.style.fontSize = "14px";
    input.style.padding = "3px";
    input.style.outline = "none";

    // Replace event text with input
    clickInfo.el.innerHTML = "";
    clickInfo.el.appendChild(input);
    input.focus();

    // Save new title when user presses "Enter" or clicks outside
    const saveNewTitle = () => {
      const newTitle = input.value.trim();
      if (newTitle) {
        const updatedEvents = events.map(event =>
          event.id === eventId
            ? {
              ...event,
              title: `${timeRange} | ${newTitle} (${formatDuration(event.extendedProps.duration)})`,
              id: `${newTitle}-${clickInfo.event.start.getTime()}`,
              className: getEventClass(newTitle, event.extendedProps.duration)
            }
            : event
        );
        setEvents(updatedEvents);
      }
    };

    input.addEventListener("blur", saveNewTitle);
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
    const eventName = prompt("Enter event name:");

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

      setEvents([...events, newEvent]); // Add new event to state
    }
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

  // Handle editing event name
  const handleEventClick = (clickInfo) => {
    const eventParts = clickInfo.event.title.split(" | ");
    const timeRange = eventParts[0];
    const oldTitleWithDuration = eventParts[1];

    // Extract event name (without duration)
    const oldTitle = cleanEventTitle(oldTitleWithDuration)
    const newTitle = prompt("Edit event name:", oldTitle);
    if (newTitle) {
      const updatedEvents = events.map(event =>
        event.id === clickInfo.event.id
          ? {
            ...event,
            title: `${timeRange} | ${newTitle} (${formatDuration(event.extendedProps.duration)})`,
            id: `${newTitle}-${clickInfo.event.start.getTime()}`,
            className: getEventClass(newTitle, event.extendedProps.duration)
          }
          : event
      );
      setEvents(updatedEvents);
    }
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
      // fetch("http://localhost:8000/add-events/",{
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

        // <button onClick={saveEventsToFile} className="save-btn"></button>
  return (
    <div className="calendar-container">
      <div className="navbar">
        {viewModes.map(mode => (
          <button
            key={mode}
            className={viewMode === mode ? "active" : ""}
            onClick={() => setViewMode(mode)}
          >
            {mode}
          </button>
        ))}
      </div>

      <div className="button-container">
        <button onClick={updateFileContent} className="copy-btn">
          Copy Events
        </button>
        <button onClick={saveEventsToFile} className="save-btn">
          Save Events
        </button>
      </div>
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

      {responseMessage && (
        <div className={`response-message ${responseMessage.includes('successfully') ? 'success' : 'error'}`}>
          <p>{responseMessage}</p>
        </div>
      )}

      <FullCalendar
        plugins={[timeGridPlugin, interactionPlugin]}
        initialDate={TimDate} // Set to tomorrow
        initialView="timeGridDay"
        events={events}
        slotMinTime="00:00:00"
        slotMaxTime="23:59:00"
        editable={true}
        eventDrop={handleEventChange}
        eventResize={handleEventResize}
        // eventClick={[handleEventClick, handleEventDelete]}
        eventClick={[handleEventClick]}
        contentHeight="auto"
        selectable={true}  // ✅ Allow time slot selection
        select={handleDateSelect} // ✅ Trigger new event creation on selection
        height="800px"
        snapDuration="00:15:00"

        /* ✅ Removed the "Today" button */
        headerToolbar={{
          left: 'title',  // Only previous & next buttons
          center: '',
          right: ''
        }}

        /* ✅ Improved event styling */
        eventContent={(arg) => (
          <div style={{
            fontSize: "14px",
            padding: "3px 6px",
            // backgroundColor: arg.event.backgroundColor || "#f0f0f0", 
            borderRadius: "4px"
          }}>
            {arg.event.title}
          </div>
        )}
        eventDidMount={(info) => {
          info.el.oncontextmenu = (e) => {  // Right-click to delete
            e.preventDefault();
            handleEventDelete(info);
          };
        }}

      />

    </div>
  );
};

export default Calendar;
