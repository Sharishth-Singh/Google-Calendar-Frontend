import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import "./index.css"; // Import CSS file

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

// Function to clean event title (remove emojis and duration)
const cleanEventTitle = (title) => {
  return title
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "") // Remove emojis
    .replace(/\s*\(\d+\s*\w+\)\s*$/, "") // Remove (360 min) or similar at the end
    .replace(/-?\d{13}/g, "") // Remove 13-digit timestamp-like numbers (e.g., -1742322600000)
    .replace(/\s*\(\d+h\s*\d*m\)\s*$/, "") // Remove (1h 30m) or similar
    .trim();
};

let TimDate = new Date(new Date().setDate(new Date().getDate() + 1))
const Calendar = () => {
  const [events, setEvents] = useState([]);
  const [savingEvent, setSavingEvent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [responseMessage, setResponseMessage] = useState("");
  const [viewMode, setViewMode] = useState("Current Events"); // Default view mode
  
  
  const viewModes = ["Current Events", "Normal Day", "Extra Class Day", "Weekend"];




  // Fetch events from API
  useEffect(() => {
    if(viewMode === "Current Events"){
      setLoading(true); // Start loading before API call
      fetch("https://sharishth.pythonanywhere.com/get_events/")
        .then((res) => res.json())
        .then((data) => {
          setLoading(false); // Stop loading after response
          if (data.status === "success" && Array.isArray(data.events)) {
            const parsedEvents = data.events.map(event => {
              const startDate = new Date(event.start);
              const endDate = new Date(event.end);
              const duration = Math.round((endDate - startDate) / (1000 * 60)); // Duration in minutes

              const cleanedTitle = cleanEventTitle(event.title);
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
            console.log(parsedEvents);
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
      "Weekend": "weekend.txt"
    };

    const selectedFile = fileMap[viewMode];
    if (selectedFile) {
      loadEventsFromFile(selectedFile);
    }
  }
}, [viewMode]);


const loadEventsFromFile = (fileName) => {
  setLoading(true); // Start loading

  fetch(fileName)
    .then(response => response.text())
    .then(text => {
      setLoading(false); // Stop loading after response
      console.log("Raw text data:", text); // Debugging

      const parsedEvents = text
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
          console.log(TimDate, currentDate);
          
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

      console.log("Parsed events from file:", parsedEvents); // Debugging
      setEvents([]); // Reset first to force re-render
      setTimeout(() => setEvents(parsedEvents), 0); // Ensure state update
    })
    .catch(err => {
      setLoading(false); // Stop loading on error
      console.error("Error loading file:", err);
    });
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

        const formattedTitle = `${formatTime(start)} - ${formatTime(end)} | ${cleanEventTitle(event.id)} (${formatDuration(duration)})`;

        return { ...event, start, end, title: formattedTitle , className: getEventClass(event.id, duration)};
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

        const formattedTitle = `${formatTime(start)} - ${formatTime(end)} | ${cleanEventTitle(event.id)} (${formatDuration(duration)})`;

        return { ...event, start, end, title: formattedTitle , className: getEventClass(event.id, duration)};
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

  // Save updated events back to API
  const saveEventsToFile = () => {
    setSavingEvent(true);

    const timeSlots = events.map(event => {
      const startTime = formatTime(event.start);
      const endTime = formatTime(event.end);
      const duration = (new Date(event.end) - new Date(event.start)) / (1000 * 60);

      // return `${startTime} - ${endTime} = ${event.id} (${formatDuration(duration)})`;
      return `${startTime} - ${endTime} = ${event.id}`;

    });

    const payload = {
      time_slots: timeSlots
    };
    console.log(payload);

    fetch("https://sharishth.pythonanywhere.com/add-events/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    })
      .then((response) => response.json())
      .then((data) => {
        setLoading(false);
        setResponseMessage("Events saved successfully!");
        console.log("Events saved successfully:", data);
      })
      .catch((error) => {
        setLoading(false);
        setResponseMessage("Error saving events. Please try again.");
        console.error("Error saving events:", error);
      });
  };

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
      <div className="button-container">
        <button onClick={saveEventsToFile} className="save-btn">
          Save Events
        </button>
      </div>
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
        eventClick={handleEventClick}
        contentHeight="auto"
        height="800px"
        snapDuration="00:15:00"
        eventContent={(arg) => {
          return (
            <div style={{ fontSize: "14px" }}>
              {arg.event.title}
            </div>
          );
        }}
      />
    </div>
  );
};

export default Calendar;
