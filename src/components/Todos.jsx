import React, { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/api';
import { invoke } from 'aws-amplify/api/function';
import { getUrl, uploadData, remove } from 'aws-amplify/storage';
import { listTodos, getTodo } from '../graphql/queries';
import { createTodo, updateTodo, deleteTodo } from '../graphql/mutations';
import { useNavigate } from 'react-router-dom';

const client = generateClient();

function Todos({ searchQuery, filterType, user }) {
    const [todos, setTodos] = useState([]);
    const [newTodo, setNewTodo] = useState({ name: '', description: '', file: null });
    const [showModal, setShowModal] = useState(false);
    const [editTodo, setEditTodo] = useState(null); // Holds the todo being edited
    const [selectedImageUrl, setSelectedImageUrl] = useState(null);



    //const navigate = useNavigate();

    useEffect(() => {
        fetchTodos();
    }, []);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setSelectedImageUrl(null);
            }
        };

        const handlePopState = () => {
            setSelectedImageUrl(null);
        };

        if (selectedImageUrl) {
            // Push dummy state into history
            window.history.pushState({ imagePreview: true }, '');
            window.addEventListener('popstate', handlePopState);
        }

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('popstate', handlePopState);
        };
    }, [selectedImageUrl]);


    const fetchTodos = async () => {
        try {
            const customListTodos = `
                query ListTodos {
                    listTodos {
                    items {
                        id
                        name
                        description
                        done
                        file
                        updatedAt
                    }
                    }
                }
                `;

            const res = await client.graphql({ query: customListTodos });
            const todosWithUrl = await Promise.all(
                res.data.listTodos.items.map(async (todo) => {
                    if (todo.file) {
                        const { url } = await getUrl({
                            path: todo.file,
                            options: { expiresIn: 3600 }
                        });
                        return { ...todo, fileUrl: url.href };
                    }
                    return todo;
                })
            );
            setTodos(todosWithUrl);
        } catch (error) {
            console.error('Error fetching todos:', error);
        }
    };


    const handleAdd = async () => {
        try {
            if (!newTodo.name.trim() && !newTodo.description.trim()) {
                alert('Title and description are required.');
                return;
            } else if (!newTodo.name.trim()) {
                alert('Title  is required.');
                return;
            } else if (!newTodo.description.trim()) {
                alert('Description is required.');
                return;
            }
            let fileKey = null;
            if (newTodo.file) {
                const fileName = `${Date.now()}-${newTodo.file.name}`;
                const s3Path = `todos/${fileName}`;
                const result = await uploadData({
                    path: s3Path,
                    data: newTodo.file,
                    options: { level: 'public' }
                }).result;
                fileKey = s3Path;
            }

            const todoInput = {
                name: newTodo.name,
                description: newTodo.description,
                file: fileKey,
                done: false
            };

            await client.graphql({ query: createTodo, variables: { input: todoInput } });
            setNewTodo({ name: '', description: '', file: null });
            setShowModal(false);
            fetchTodos();
        } catch (error) {
            console.error('Error adding todo:', error);
        }
    };

    const handleDelete = async (id) => {
        try {
            const todoResult = await client.graphql({ query: getTodo, variables: { id } });
            const todo = todoResult.data.getTodo;

            if (todo.file) {
                const s3Key = todo.file.replace(/^\/?public\//, '');
                await remove({ key: s3Key, options: { level: 'public' } });
            }

            await client.graphql({ query: deleteTodo, variables: { input: { id } } });
            fetchTodos();
        } catch (error) {
            console.error("Error deleting todo and image:", error);
        }
    };

    const handleToggleDone = async (todo) => {
        try {
            console.log("user : ", user)
            console.log("todo : ", todo)
            if (!todo.done) {
                const data = "Hello " + user?.attributes?.name || user?.attributes?.email?.split('@')[0] || 'User' + ", Your Todo - '" + todo.name + "' with description - '" + todo.description + "' has been marked as completed successfully !"
                console.log("data : ", data)
                await invoke({
                    functionName: "sendEmail",
                    body: {
                        email: "karanvaghela565@gmil.com",
                        subject: "Todo completion update",
                        body: data,
                    },
                });

            }
            await client.graphql({
                query: updateTodo,
                variables: { input: { id: todo.id, done: !todo.done } },
            });
            fetchTodos();
        } catch (error) {
            console.error("Error toggling todo:", error);
        }
    };
    const convertToIST = (utcDateString) => {
        const date = new Date(utcDateString);

        const time = new Intl.DateTimeFormat('en-IN', {
            timeZone: 'Asia/Kolkata',
            hour: 'numeric',
            minute: 'numeric',
            hour12: true
        }).format(date);

        const day = new Intl.DateTimeFormat('en-IN', {
            timeZone: 'Asia/Kolkata',
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).format(date);

        return `${time}, ${day}`;
    };

    const handleUpdate = async (todo) => {
        try {
            if (!todo.name.trim() && !todo.description.trim()) {
                alert('Title and description are required.');
                return;
            } else if (!todo.name.trim()) {
                alert('Title  is required.');
                return;
            } else if (!todo.description.trim()) {
                alert('Description is required.');
                return;
            }
            let updatedFields = {
                id: todo.id,
                name: todo.name,
                description: todo.description,
            };

            if (todo.newFile) {
                const newFileName = `${Date.now()}-${todo.newFile.name}`;
                const newS3Path = `todos/${newFileName}`;

                // Upload new file
                await uploadData({
                    path: newS3Path,
                    data: todo.newFile,
                    options: { level: 'public' }
                }).result;

                // Remove old file
                if (todo.file) {
                    const oldKey = todo.file.replace(/^\/?public\//, '');
                    await remove({ key: oldKey, options: { level: 'public' } });
                }

                updatedFields.file = newS3Path;
            }

            await client.graphql({ query: updateTodo, variables: { input: updatedFields } });

            setEditTodo(null);
            fetchTodos();
        } catch (error) {
            console.error("Error updating todo:", error);
        }
    };


    const filterTodos = (todos, searchQuery, filterType) => {
        const hasSearch = searchQuery.trim() !== '';

        // Filter todos based on search query
        const searchedTodos = hasSearch
            ? todos.filter(todo =>
                todo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                todo.description.toLowerCase().includes(searchQuery.toLowerCase())
            )
            : todos;

        // Filter todos based on the filter type (all, completed, remaining)
        const filteredTodos = searchedTodos.filter(todo =>
            filterType === 'all' ||
            (filterType === 'completed' && todo.done) ||
            (filterType === 'remaining' && !todo.done)
        );

        return filteredTodos;
    };


    // Usage in your component:
    const filteredTodos = filterTodos(todos, searchQuery, filterType);


    return (
        <>
            <div className="bg-gradient-to-br from-gray-100 to-gray-300 min-h-screen">
                {/* Todos Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
                    {filteredTodos.map(todo => (
                        <div
                            key={todo.id}
                            className="bg-gradient-to-r from-gray-700 via-gray-600 to-gray-800 bg-opacity-60 backdrop-blur-md text-white p-6 rounded-xl shadow-md border border-gray-200"
                        >
                            <div className='flex justify-between'>
                                <div>
                                    <h2 className="text-xl font-semibold mb-2 underline">{todo.name}</h2>
                                    <p className="text-sm mb-4">{todo.description}</p>
                                </div>
                                {todo.done ?
                                    <div className='text-xs mt-2'>
                                        Task completed at <br />
                                        <p className='text-green-600'>
                                            {convertToIST(todo.updatedAt)}
                                        </p>
                                    </div>
                                    :
                                    // <div className='text-xs text-red-400 mt-2'>
                                    //     Task pending !
                                    // </div>
                                    ""
                                }
                            </div>
                            {todo.fileUrl ? (
                                <img
                                    src={todo.fileUrl}
                                    alt="Todo"
                                    className="w-full h-48 object-cover rounded-lg border mb-4 cursor-pointer hover:opacity-80 transition"
                                    onClick={() => setSelectedImageUrl(todo.fileUrl)}
                                />

                            ) : (
                                <div className='flex items-center justify-center w-full h-48 object-cover rounded-lg border mb-4 text-2xl'>
                                    No Image Found...
                                </div>

                            )}

                            <div className="flex justify-between items-center  mt-4">
                                <button
                                    onClick={() => handleToggleDone(todo)}
                                    className={` py-2 rounded-lg text-white font-medium transition duration-200 ${todo.done ? 'px-5 bg-green-700 hover:bg-green-800' : 'px-7 bg-yellow-700 hover:bg-yellow-800'}`}
                                >
                                    {todo.done ? 'Undone' : 'Done'}
                                </button>

                                <div className="flex justify-between items-center">
                                    <button
                                        onClick={() => !todo.done && setEditTodo(todo)}
                                        disabled={todo.done}
                                        className={`px-7 py-2 mx-3 rounded-lg transition duration-200 flex items-center gap-1 ${todo.done
                                            ? 'bg-gray-400 text-white cursor-not-allowed line-through'
                                            : 'bg-blue-900 text-white hover:bg-blue-950'
                                            }`}
                                    >
                                        Edit
                                    </button>


                                    <button
                                        onClick={() => handleDelete(todo.id)}
                                        className="px-4 py-2 bg-red-900 text-white rounded-lg hover:bg-red-950 transition duration-200"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>


                        </div>
                    ))}
                </div>

                {/* Floating Add Todo Button */}
                <button
                    onClick={() => setShowModal(true)}
                    className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition duration-200 z-50"
                >
                    + Add Todo
                </button>

                {/* Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-white/30 backdrop-blur-md flex items-center justify-center z-50">
                        <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md">
                            <h2 className="text-xl font-semibold mb-4 text-gray-800">Add New Todo</h2>
                            <input
                                type="text"
                                placeholder="Todo Title"
                                value={newTodo.name}
                                onChange={(e) => setNewTodo({ ...newTodo, name: e.target.value })}
                                className="w-full p-2 mb-4 border border-gray-300 rounded"

                            />
                            <textarea
                                placeholder="Description"
                                value={newTodo.description}
                                onChange={(e) => setNewTodo({ ...newTodo, description: e.target.value })}
                                className="w-full p-2 mb-4 border border-gray-300 rounded"

                            />

                            {/* Custom File Button */}
                            <label className="mb-4 block">
                                <span className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg cursor-pointer hover:bg-gray-400 transition inline-block">
                                    Choose Image
                                </span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setNewTodo({ ...newTodo, file: e.target.files[0] })}
                                    className="hidden"
                                />
                            </label>
                            {newTodo.file && (
                                <p className="text-sm text-gray-600 mb-4">Selected: {newTodo.file.name}</p>
                            )}

                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAdd}
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                    Submit
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {editTodo && (
                    <div className="fixed inset-0 bg-white/30 backdrop-blur-md flex items-center justify-center z-50">
                        <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md">
                            <h2 className="text-xl font-semibold mb-4 text-gray-800">Edit Todo</h2>
                            <input
                                type="text"
                                value={editTodo.name}
                                placeholder="Todo Title"
                                onChange={(e) => setEditTodo({ ...editTodo, name: e.target.value })}
                                className="w-full p-2 mb-4 border border-gray-300 rounded"
                            />
                            <textarea
                                value={editTodo.description}
                                placeholder="Todo Description"
                                onChange={(e) => setEditTodo({ ...editTodo, description: e.target.value })}
                                className="w-full p-2 mb-4 border border-gray-300 rounded"
                            />
                            <label className="mb-4 block">
                                <span className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg cursor-pointer hover:bg-gray-400 transition inline-block">
                                    {editTodo.file ? "Replace" : "Add"} Image
                                </span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setEditTodo({ ...editTodo, newFile: e.target.files[0] })}
                                    className="hidden"
                                />
                            </label>
                            {editTodo.newFile && (
                                <p className="text-sm text-gray-600 mb-4">New: {editTodo.newFile.name}</p>
                            )}

                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => setEditTodo(null)}
                                    className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleUpdate(editTodo)}
                                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                                >
                                    Update
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {selectedImageUrl && (
                    <div
                        className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[100]"
                        onClick={() => setSelectedImageUrl(null)}
                        onKeyDown={(e) => e.key === 'Escape' && setSelectedImageUrl(null)}
                        tabIndex={0}
                    >
                        <img
                            src={selectedImageUrl}
                            alt="Full Screen Preview"
                            className="max-w-full max-h-full object-contain p-4 rounded-lg"
                            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking on the image
                        />
                    </div>
                )}
            </div>
        </>
    );
}

export default Todos;
