import { useState, useEffect } from "react";

export default function StudiosTable() {
  const [bookings, setBookings] = useState([]);

  const [editID, seteditID] = useState("");
  const [editfullName, seteditfullName] = useState("");
  const [editcheckIn, seteditcheckIn] = useState("");
  const [isModalOpen, setisModalOpen] = useState(false);

  const bookings_url = 'http://localhost:8080/api/bookings';

  useEffect(() => {
    fetch(bookings_url)
      .then((response) => response.json())
      .then((data) => {
        setBookings(data);
      })
      .catch((err) => console.log('Error in fetching', err));
  }, []);

  function openEditModal(booking) {
    setisModalOpen(true);
    seteditID(booking.id);
    seteditfullName(booking.fullName);
    seteditcheckIn(booking.checkIn);
  }

  async function handleUpdate(e) {
    e.preventDefault();
    const response = await fetch(`${bookings_url}/${editID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: editfullName,
        checkIn: editcheckIn,
      })
    });

    const data = await response.json();

    setBookings((prev) =>
      prev.map((b) => (b.id === editID ? data : b))
    );

    setisModalOpen(false);
  }

  async function handleDelete(id) {
    if (!window.confirm(`Are you sure you want to delete booking ${id}?`)) return;

    try {
      const response = await fetch(`${bookings_url}/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        console.log('Delete failed');
        return;
      }

      setBookings((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      console.log('Error in deleting', err);
    }
  }

  return (
    <div className="container text-center mt-5">
      <h2 className="text-center mb-4">Bookings</h2>
      <table className="table table-striped table-bordered">
        <thead>
          <tr>
            <th>Name</th>
            <th>Booking ID</th>
            <th>Date</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking) => (
            <tr key={booking.id}>
              <td>{booking.fullName}</td>
              <td>{booking.id}</td>
              <td>{booking.checkIn}</td>
              <td>
                <button
                  type="button"
                  className="btn btn-outline-primary me-2"
                  onClick={() => openEditModal(booking)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="btn btn-outline-danger"
                  onClick={() => handleDelete(booking.id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {isModalOpen && (
        <div className="modal show d-block" tabIndex="-1" role="dialog">
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit Booking</h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={() => setisModalOpen(false)}
                ></button>
              </div>
              <form onSubmit={handleUpdate}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label htmlFor="editName" className="form-label">
                      Name
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="editName"
                      value={editfullName}
                      onChange={(e) => seteditfullName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="editDate" className="form-label">
                      Date
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      id="editDate"
                      value={editcheckIn}
                      onChange={(e) => seteditcheckIn(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setisModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}