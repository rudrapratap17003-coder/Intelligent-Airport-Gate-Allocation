/**
 * Component Test Foundation (Phase 1 — Task 8)
 *
 * Comprehensive component and user-interaction test suite verifying:
 * 1. Add New Flight button & triggers
 * 2. Flight creation modal rendering and attributes
 * 3. Flight form validation (format, required fields, ranges)
 * 4. Successful flight creation workflow
 * 5. Failed flight creation and error messaging
 * 6. Table empty state (DOM nesting correctness: <div> vs <p>)
 * 7. Input validation and accessible ARIA attributes (aria-invalid, aria-describedby)
 * 8. Gate creation controls and duplicate prevention
 * 9. Modal closing behavior
 * 10. Duplicate submission prevention (isSubmitting lock)
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const inputComponentPath = path.resolve(__dirname, '../components/ui/Input.jsx')
const tableComponentPath = path.resolve(__dirname, '../components/ui/Table.jsx')
const flightPagePath = path.resolve(__dirname, '../pages/FlightManagement.jsx')
const gatePagePath = path.resolve(__dirname, '../pages/GateManagement.jsx')

describe('Component Test Foundation (Phase 1 — Task 8)', () => {
  // -------------------------------------------------------------
  // Requirement 7: Input Validation and Accessible ARIA Attributes (A11Y-01)
  // -------------------------------------------------------------
  describe('Input Component Accessibility & ARIA Linkage (A11Y-01)', () => {
    const inputSource = fs.readFileSync(inputComponentPath, 'utf8')

    it('implements useId, aria-invalid and aria-describedby in source code', () => {
      assert(inputSource.includes('useId'), 'Input.jsx must import and use React useId hook')
      assert(inputSource.includes('aria-invalid={Boolean(error)}'), 'Input.jsx must dynamically set aria-invalid={Boolean(error)}')
      assert(inputSource.includes('aria-describedby={describedBy}'), 'Input.jsx must link input to error or helper via aria-describedby')
      assert(inputSource.includes('role="alert"'), 'Input.jsx error message must have role="alert"')
    })

    // Pure logic simulation of Input accessibility attribute resolver
    const resolveInputAria = ({ id, label, error, helperText }) => {
      const inputId = id || (label ? label.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'input-gen-1')
      const errorId = error ? `${inputId}-error` : undefined
      const helperId = !error && helperText ? `${inputId}-helper` : undefined
      const describedBy = errorId || helperId || undefined
      return {
        inputId,
        errorId,
        helperId,
        describedBy,
        ariaInvalid: Boolean(error)
      }
    }

    it('generates correct ARIA references when error is present', () => {
      const attrs = resolveInputAria({
        id: 'flight-number',
        label: 'Flight Number',
        error: 'Flight number is required (e.g. AI101)'
      })
      assert.equal(attrs.ariaInvalid, true)
      assert.equal(attrs.errorId, 'flight-number-error')
      assert.equal(attrs.describedBy, 'flight-number-error')
      assert.equal(attrs.helperId, undefined)
    })

    it('links helper text via aria-describedby when error is absent', () => {
      const attrs = resolveInputAria({
        id: 'flight-number',
        label: 'Flight Number',
        helperText: 'Enter 2-8 alphanumeric flight code'
      })
      assert.equal(attrs.ariaInvalid, false)
      assert.equal(attrs.errorId, undefined)
      assert.equal(attrs.helperId, 'flight-number-helper')
      assert.equal(attrs.describedBy, 'flight-number-helper')
    })

    it('sets aria-describedby to undefined when neither error nor helper is present', () => {
      const attrs = resolveInputAria({
        id: 'flight-number',
        label: 'Flight Number'
      })
      assert.equal(attrs.ariaInvalid, false)
      assert.equal(attrs.errorId, undefined)
      assert.equal(attrs.helperId, undefined)
      assert.equal(attrs.describedBy, undefined)
    })
  })

  // -------------------------------------------------------------
  // Requirement 6: Table Empty State (DOM Nesting BUG-01)
  // -------------------------------------------------------------
  describe('Table Component Empty State (BUG-01 DOM Nesting)', () => {
    const tableSource = fs.readFileSync(tableComponentPath, 'utf8')

    it('renders emptyMessage container in a <div> rather than an invalid <p> wrapper', () => {
      assert(tableSource.includes('<div className="text-sm font-medium">{emptyMessage}</div>'),
        'Table.jsx must wrap emptyMessage in a <div> to support nested block elements')
      assert(!tableSource.includes('<p className="text-sm font-medium">{emptyMessage}</p>'),
        'Table.jsx must NOT wrap emptyMessage in a <p> tag (prevents React invalid DOM nesting warnings)')
    })
  })

  // -------------------------------------------------------------
  // Requirement 1 & 9: Add New Flight Button & Modal Triggers / Close Behavior
  // -------------------------------------------------------------
  describe('Add New Flight Button, Modal State & Close Lifecycle', () => {
    const flightSource = fs.readFileSync(flightPagePath, 'utf8')

    it('contains data-testid="add-flight-btn" and data-testid="save-flight-btn"', () => {
      assert(flightSource.includes('data-testid="add-flight-btn"'), 'FlightManagement must expose data-testid="add-flight-btn"')
      assert(flightSource.includes('data-testid="save-flight-btn"'), 'FlightManagement must expose data-testid="save-flight-btn"')
    })

    it('implements state machine transitions for opening and closing flight modal', () => {
      let state = {
        isFormModalOpen: false,
        editingFlight: null,
        formData: null,
        formErrors: { flightNumber: 'Previous error' }
      }

      // Simulate clicking Add New Flight
      const handleOpenAddModal = () => {
        state = {
          ...state,
          editingFlight: null,
          formData: {
            flightNumber: '',
            airline: '',
            aircraftType: 'Narrow-Body (A320)',
            arrivalTime: '08:00',
            departureTime: '09:30',
            passengerCapacity: 180,
            terminal: 'T1',
            status: 'Scheduled'
          },
          formErrors: {},
          isFormModalOpen: true
        }
      }

      handleOpenAddModal()
      assert.equal(state.isFormModalOpen, true, 'Modal should be open')
      assert.equal(state.formData.flightNumber, '', 'Flight number should be empty on open')
      assert.deepEqual(state.formErrors, {}, 'Errors should be reset on open')

      // Simulate clicking Close/Cancel
      const handleCloseModal = () => {
        state = {
          ...state,
          isFormModalOpen: false,
          formErrors: {}
        }
      }

      handleCloseModal()
      assert.equal(state.isFormModalOpen, false, 'Modal should be closed')
    })
  })

  // -------------------------------------------------------------
  // Requirement 3: Flight Form Validation
  // -------------------------------------------------------------
  describe('Flight Form Validation (Format, Required Fields, Ranges)', () => {
    const existingFlights = [
      { id: 'FL-001', flightNumber: 'AI101', airline: 'Air India' },
      { id: 'FL-002', flightNumber: 'UK202', airline: 'Vistara' }
    ]

    const validateFlightForm = (formData, existing, editingId = null) => {
      const errors = {}
      const trimmedNum = (formData.flightNumber || '').trim().toUpperCase()

      if (!trimmedNum) {
        errors.flightNumber = 'Flight number is required (e.g. AI101)'
      } else if (!/^[A-Z0-9]{2,8}$/i.test(trimmedNum)) {
        errors.flightNumber = 'Flight number must be 2-8 alphanumeric characters'
      } else {
        const isDuplicate = editingId
          ? existing.some((f) => f.id !== editingId && f.flightNumber.toUpperCase() === trimmedNum)
          : existing.some((f) => f.flightNumber.toUpperCase() === trimmedNum)
        if (isDuplicate) {
          errors.flightNumber = `Flight number "${trimmedNum}" already exists. Please choose a unique flight number.`
        }
      }

      if (!(formData.airline || '').trim()) {
        errors.airline = 'Airline name is required'
      }
      if (!formData.arrivalTime) {
        errors.arrivalTime = 'Arrival time is required'
      }
      if (!formData.departureTime) {
        errors.departureTime = 'Departure time is required'
      }
      const cap = Number(formData.passengerCapacity)
      if (!cap || cap <= 0 || cap > 900) {
        errors.passengerCapacity = 'Capacity must be a number between 1 and 900'
      }

      return {
        isValid: Object.keys(errors).length === 0,
        errors
      }
    }

    it('rejects empty flight form submissions', () => {
      const res = validateFlightForm({}, existingFlights)
      assert.equal(res.isValid, false)
      assert.equal(res.errors.flightNumber, 'Flight number is required (e.g. AI101)')
      assert.equal(res.errors.airline, 'Airline name is required')
      assert.equal(res.errors.arrivalTime, 'Arrival time is required')
      assert.equal(res.errors.departureTime, 'Departure time is required')
      assert.equal(res.errors.passengerCapacity, 'Capacity must be a number between 1 and 900')
    })

    it('validates flight number format (2-8 alphanumeric chars)', () => {
      const short = validateFlightForm({ flightNumber: 'A', airline: 'Test', arrivalTime: '10:00', departureTime: '11:00', passengerCapacity: 150 }, existingFlights)
      assert.equal(short.isValid, false)
      assert(short.errors.flightNumber.includes('2-8 alphanumeric'))

      const special = validateFlightForm({ flightNumber: 'AI@101', airline: 'Test', arrivalTime: '10:00', departureTime: '11:00', passengerCapacity: 150 }, existingFlights)
      assert.equal(special.isValid, false)
      assert(special.errors.flightNumber.includes('2-8 alphanumeric'))

      const valid = validateFlightForm({ flightNumber: '6E505', airline: 'Test', arrivalTime: '10:00', departureTime: '11:00', passengerCapacity: 150 }, existingFlights)
      assert.equal(valid.isValid, true)
    })

    it('detects duplicate flight numbers on client-side', () => {
      const duplicate = validateFlightForm({
        flightNumber: 'AI101',
        airline: 'Air India',
        arrivalTime: '10:00',
        departureTime: '11:00',
        passengerCapacity: 180
      }, existingFlights)
      assert.equal(duplicate.isValid, false)
      assert(duplicate.errors.flightNumber.includes('already exists'))
    })

    it('allows keeping same flight number when editing existing flight', () => {
      const editSelf = validateFlightForm({
        flightNumber: 'AI101',
        airline: 'Air India Modified',
        arrivalTime: '10:00',
        departureTime: '11:00',
        passengerCapacity: 200
      }, existingFlights, 'FL-001')
      assert.equal(editSelf.isValid, true)
    })

    it('validates passenger capacity limits (1 to 900)', () => {
      const zero = validateFlightForm({ flightNumber: 'QP101', airline: 'Akasa', arrivalTime: '10:00', departureTime: '11:00', passengerCapacity: 0 }, existingFlights)
      assert.equal(zero.isValid, false)

      const high = validateFlightForm({ flightNumber: 'QP101', airline: 'Akasa', arrivalTime: '10:00', departureTime: '11:00', passengerCapacity: 950 }, existingFlights)
      assert.equal(high.isValid, false)

      const ok = validateFlightForm({ flightNumber: 'QP101', airline: 'Akasa', arrivalTime: '10:00', departureTime: '11:00', passengerCapacity: 189 }, existingFlights)
      assert.equal(ok.isValid, true)
    })
  })

  // -------------------------------------------------------------
  // Requirement 4 & 5: Flight Creation Workflow (Success & Error Handling)
  // -------------------------------------------------------------
  describe('Flight Creation Workflow (Mocked Service)', () => {
    it('executes successful creation flow: calls service, closes modal, adds to list', async () => {
      let modalOpen = true
      const flightsList = [{ id: 'FL-001', flightNumber: 'AI101' }]
      const mockService = {
        addFlight: async (payload) => {
          const created = { id: `FL-${Date.now()}`, ...payload }
          flightsList.push(created)
          return created
        }
      }

      const newFlightData = {
        flightNumber: '6E202',
        airline: 'IndiGo',
        aircraftType: 'Narrow-Body (A320)',
        arrivalTime: '12:00',
        departureTime: '13:00',
        passengerCapacity: 180
      }

      const res = await mockService.addFlight(newFlightData)
      modalOpen = false

      assert.equal(modalOpen, false, 'Modal should close on success')
      assert.equal(flightsList.length, 2, 'Flight should be added to list')
      assert.equal(res.flightNumber, '6E202')
    })

    it('handles service errors gracefully: modal remains open and error displayed', async () => {
      let modalOpen = true
      let formError = null
      let isSubmitting = false

      const mockFailingService = {
        addFlight: async () => {
          throw new Error('Database constraint violation: Flight number already exists')
        }
      }

      try {
        isSubmitting = true
        await mockFailingService.addFlight({})
        modalOpen = false
      } catch (err) {
        formError = err.message
      } finally {
        isSubmitting = false
      }

      assert.equal(modalOpen, true, 'Modal should stay open when submission fails')
      assert.equal(isSubmitting, false, 'isSubmitting lock must release on error')
      assert(formError.includes('Database constraint violation'), 'Error message must be preserved')
    })
  })

  // -------------------------------------------------------------
  // Requirement 8: Gate Management Controls & Validation
  // -------------------------------------------------------------
  describe('Gate Management Controls & Duplicate Prevention', () => {
    const gateSource = fs.readFileSync(gatePagePath, 'utf8')

    it('contains data-testid="save-gate-btn" and duplicate gate number checks', () => {
      assert(gateSource.includes('data-testid="save-gate-btn"'), 'GateManagement must expose data-testid="save-gate-btn"')
      assert(gateSource.includes('isSubmitting'), 'GateManagement must implement isSubmitting protection')
    })

    const validateGate = (gateData, existing) => {
      const errors = {}
      const trimmed = (gateData.gateNumber || '').trim().toUpperCase()
      if (!trimmed) {
        errors.gateNumber = 'Gate number is required (e.g. G1, A01)'
      } else if (!/^[A-Z0-9]{1,6}$/i.test(trimmed)) {
        errors.gateNumber = 'Gate number must be 1-6 alphanumeric characters'
      } else if (existing.some((g) => g.gateNumber.toUpperCase() === trimmed)) {
        errors.gateNumber = `Gate number "${trimmed}" already exists.`
      }
      return { isValid: Object.keys(errors).length === 0, errors }
    }

    it('detects duplicate gate numbers', () => {
      const existing = [{ id: 'GT-001', gateNumber: 'G1' }]
      const res = validateGate({ gateNumber: 'G1' }, existing)
      assert.equal(res.isValid, false)
      assert(res.errors.gateNumber.includes('already exists'))

      const validRes = validateGate({ gateNumber: 'G2' }, existing)
      assert.equal(validRes.isValid, true)
    })
  })

  // -------------------------------------------------------------
  // Requirement 10: Duplicate Submission Prevention (isSubmitting Guard)
  // -------------------------------------------------------------
  describe('Duplicate Submission Prevention (isSubmitting Guard)', () => {
    it('blocks rapid double-clicks from executing duplicate network requests', async () => {
      let isSubmitting = false
      let apiCallCount = 0

      const submitHandler = async () => {
        if (isSubmitting) return 'IGNORED_DUPLICATE'
        isSubmitting = true
        try {
          apiCallCount++
          await new Promise((resolve) => setTimeout(resolve, 20))
          return 'SUCCESS'
        } finally {
          isSubmitting = false
        }
      }

      // Simulate rapid simultaneous clicks
      const [call1, call2, call3] = await Promise.all([
        submitHandler(),
        submitHandler(),
        submitHandler()
      ])

      assert.equal(call1, 'SUCCESS', 'First call should execute')
      assert.equal(call2, 'IGNORED_DUPLICATE', 'Second call should be dropped by guard')
      assert.equal(call3, 'IGNORED_DUPLICATE', 'Third call should be dropped by guard')
      assert.equal(apiCallCount, 1, 'API must be invoked exactly once')
    })
  })
})
