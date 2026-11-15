/**
 * Flight Service Layer
 * Authoritative persistence via FastAPI Backend (/api/v1/flights).
 * Silent LocalStorage fallback is strictly removed to prevent inconsistent data state.
 */

import api from './api'

const LEGACY_STORAGE_KEY = 'gatewise_flights_data'

export const INITIAL_SAMPLE_FLIGHTS = [
  {
    id: 'FL-001',
    flightNumber: 'AI101',
    airline: 'Air India',
    aircraftType: 'Wide-Body (B777)',
    arrivalTime: '08:30',
    departureTime: '10:00',
    passengerCapacity: 342,
    terminal: 'T2',
    status: 'Scheduled'
  },
  {
    id: 'FL-002',
    flightNumber: 'UK202',
    airline: 'Vistara',
    aircraftType: 'Narrow-Body (A320)',
    arrivalTime: '08:45',
    departureTime: '09:45',
    passengerCapacity: 164,
    terminal: 'T2',
    status: 'Scheduled'
  },
  {
    id: 'FL-003',
    flightNumber: '6E303',
    airline: 'IndiGo',
    aircraftType: 'Narrow-Body (A321)',
    arrivalTime: '09:00',
    departureTime: '10:15',
    passengerCapacity: 222,
    terminal: 'T1',
    status: 'Boarding'
  },
  {
    id: 'FL-004',
    flightNumber: 'SG404',
    airline: 'SpiceJet',
    aircraftType: 'Narrow-Body (B737)',
    arrivalTime: '09:15',
    departureTime: '10:30',
    passengerCapacity: 189,
    terminal: 'T1',
    status: 'Scheduled'
  },
  {
    id: 'FL-005',
    flightNumber: 'AI505',
    airline: 'Air India',
    aircraftType: 'Wide-Body (A350)',
    arrivalTime: '09:30',
    departureTime: '11:15',
    passengerCapacity: 316,
    terminal: 'T2',
    status: 'Delayed'
  },
  {
    id: 'FL-006',
    flightNumber: 'UK606',
    airline: 'Vistara',
    aircraftType: 'Narrow-Body (A320)',
    arrivalTime: '09:45',
    departureTime: '10:45',
    passengerCapacity: 164,
    terminal: 'T2',
    status: 'Scheduled'
  }
]

// Wire-format adapters between API (snake_case) and UI (camelCase)
export const mapFlightFromApi = (f) => ({
  id: f.id,
  flightNumber: f.flight_number || f.flightNumber,
  airline: f.airline,
  aircraftType: f.aircraft_type || f.aircraftType,
  arrivalTime: f.arrival_time || f.arrivalTime,
  departureTime: f.departure_time || f.departureTime,
  passengerCapacity: f.passenger_capacity !== undefined ? f.passenger_capacity : f.passengerCapacity,
  terminal: f.terminal,
  status: f.status,
  createdAt: f.created_at || f.createdAt,
  updatedAt: f.updated_at || f.updatedAt
})

export const mapFlightToApi = (f) => ({
  id: f.id,
  flight_number: f.flightNumber ? f.flightNumber.trim().toUpperCase() : '',
  airline: f.airline ? f.airline.trim() : '',
  aircraft_type: f.aircraftType,
  arrival_time: f.arrivalTime,
  departure_time: f.departureTime,
  passenger_capacity: Number(f.passengerCapacity),
  terminal: f.terminal,
  status: f.status
})

export const flightService = {
  /**
   * Fetch all flights from FastAPI backend.
   * Throws an error if backend is unavailable.
   */
  getFlights: async () => {
    try {
      const res = await api.get('/flights')
      const mapped = res.data.map(mapFlightFromApi)
      // Mirror to legacy backup for safe disaster recovery only
      try {
        localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(mapped))
      } catch {
        // Ignore localStorage write failures
      }
      return mapped
    } catch (e) {
      throw new Error(e.message || 'Failed to retrieve flights from backend database.')
    }
  },

  /**
   * Create a new flight in backend database.
   * Throws error on connection failure or validation/duplicate error.
   */
  addFlight: async (flightData) => {
    const payload = mapFlightToApi(flightData)
    try {
      const res = await api.post('/flights', payload)
      return mapFlightFromApi(res.data)
    } catch (e) {
      throw new Error(e.message || 'Failed to create flight in backend database.')
    }
  },

  /**
   * Update an existing flight in backend database.
   * Throws error on connection failure or validation error.
   */
  updateFlight: async (id, flightData) => {
    const payload = mapFlightToApi(flightData)
    try {
      const res = await api.put(`/flights/${id}`, payload)
      return mapFlightFromApi(res.data)
    } catch (e) {
      throw new Error(e.message || `Failed to update flight ${id} in backend database.`)
    }
  },

  /**
   * Delete flight from backend database.
   * Throws error on conflict (referential integrity) or connection failure.
   */
  deleteFlight: async (id) => {
    try {
      await api.delete(`/flights/${id}`)
      return true
    } catch (e) {
      throw new Error(e.message || `Failed to delete flight ${id} from backend database.`)
    }
  },

  /**
   * Explicit migration utility to recover legacy data if needed
   */
  getLegacyBackup: () => {
    try {
      const data = localStorage.getItem(LEGACY_STORAGE_KEY)
      return data ? JSON.parse(data) : INITIAL_SAMPLE_FLIGHTS
    } catch {
      return INITIAL_SAMPLE_FLIGHTS
    }
  }
}

export default flightService
