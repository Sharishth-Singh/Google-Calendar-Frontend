import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API = 'https://sharishth.pythonanywhere.com/todos/'; // Adjust port if needed

function Todo() {
  const [todos, setTodos] = useState([]);
  const [title, setTitle] = useState('');

  // 🔄 Get all todos
  const fetchTodos = async () => {
    const res = await axios.get(API);
    setTodos(res.data);
  };

  // ➕ Add todo
  const addTodo = async () => {
    if (title.trim()) {
      await axios.post(API, { title });
      setTitle('');
      fetchTodos();
    }
  };

  // ✅ Toggle completed
  const toggleTodo = async (todo) => {
    await axios.put(`${API}${todo.id}/`, {
      ...todo,
      completed: !todo.completed,
    });
    fetchTodos();
  };

  // ❌ Delete todo
  const deleteTodo = async (id) => {
    await axios.delete(`${API}${id}/`);
    fetchTodos();
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  return (
    <div style={{
      width: '400px',             // 👈 fixed width
      margin: '40px auto',
      padding: 20,
      border: '1px solid #ddd',
      borderRadius: 8,
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      fontFamily: 'Arial, sans-serif',
      background: '#f9f9f9',
      // overflowY: 'auto',       // 👈 enable scroll if needed

    }}>
      <h2 style={{ textAlign: 'center', color: '#333' }}>📝 My To-Do List</h2>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <input
          placeholder="Add new task"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{
            flex: 1,
            padding: 8,
            borderRadius: 4,
            border: '1px solid #ccc',
            width: '300px'
          }}
        />
        <button
          onClick={addTodo}
          style={{
            padding: '8px 12px',
            borderRadius: 4,
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Add
        </button>
      </div>

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {todos.map((todo) => (
          <li
            key={todo.id}
            style={{
              maxWidth: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 10px',
              marginBottom: 8,
              borderRadius: 4,
              background: '#fff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <span
              onClick={() => toggleTodo(todo)}
              style={{
                width: '300px',
                // maxWidth: '250px',         // 👈 limit width
                wordWrap: 'break-word',    // 👈 break long words
                textDecoration: todo.completed ? 'line-through' : 'none',
                cursor: 'pointer',
                color: todo.completed ? '#888' : '#333',
                flexShrink: 0
              }}
            >
              {todo.title}
            </span>


            <button
              onClick={() => deleteTodo(todo.id)}
              style={{
                marginLeft: 10,
                backgroundColor: '#e74c3c',
                color: 'white',
                border: 'none',
                padding: '4px 8px',
                borderRadius: 4,
                cursor: 'pointer'
              }}
            >
              ❌
            </button>
          </li>

        ))}
      </ul>
    </div>

  );
}

export default Todo;
