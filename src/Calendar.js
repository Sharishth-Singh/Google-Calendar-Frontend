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
  return title.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "") // Remove emojis
    .replace(/\s*\(\d+\s*\w+\)\s*$/, "") // Remove (360 min) or similar at the end
    .trim();
};

const Calendar = () => {
  const [events, setEvents] = useState([]);
  const [savingEvent, setSavingEvent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [responseMessage, setResponseMessage] = useState("");

  // Fetch events from API
  useEffect(() => {
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
              id: cleanedTitle.trim(),
              extendedProps: { duration },
              className: eventClass
            };
          });
          setEvents(parsedEvents);
          console.log(parsedEvents);

        } else {
          console.error("Invalid API response format");
        }
      })
      .catch((err) => {
        setLoading(false); // Stop loading on error
        console.error("Error fetching events:", err);
      });
  }, []);


  // Handle drag-and-drop event change
  const handleEventChange = (eventChangeInfo) => {
    const updatedEvents = events.map(event => {
      if (event.id === eventChangeInfo.event.id) {
        const start = eventChangeInfo.event.start;
        const end = eventChangeInfo.event.end;
        const duration = Math.round((end - start) / (1000 * 60)); // Convert ms to minutes

        const formattedTitle = `${formatTime(start)} - ${formatTime(end)} | ${event.id} (${formatDuration(duration)})`;

        return { ...event, start, end, title: formattedTitle };
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

        const formattedTitle = `${formatTime(start)} - ${formatTime(end)} | ${event.id} (${formatDuration(duration)})`;

        return { ...event, start, end, title: formattedTitle };
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
    const oldTitle = oldTitleWithDuration.replace(/\(\d+[mh]\)$/, "").trim();


    const newTitle = prompt("Edit event name:", oldTitle);
    if (newTitle) {
      const updatedEvents = events.map(event =>
        event.id === clickInfo.event.id
          ? {
            ...event,
            title: `${timeRange} | ${newTitle} (${formatDuration(event.extendedProps.duration)})`,
            id: newTitle
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
      <div className="button-container">
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
        initialDate={new Date(new Date().setDate(new Date().getDate() + 1))} // Set to tomorrow
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
