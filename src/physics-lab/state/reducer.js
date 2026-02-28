// Physics Lab State Management

// Random tilt for new tracks
const randTilt = () => ((Math.random() * 2 - 1) * 10 * Math.PI) / 180;

// Initial state
export const initialState = {
  labItems: [],          // All equipment instances (placed or in tray)
  strings: [],           // String connections [{id, stringOwnerId, end:"A"|"B", targetId, targetPoint}]
  notebookEntries: [],   // Notebook content (richtext HTML, images)
  activeTab: "lab",      // "lab" | "equipment" | "notebook"
  nbPanel: false,        // Notebook side panel open in lab view
  nextId: 1,             // Auto-increment ID for new items
  selectedId: null       // Currently selected item ID (for mass slider, string panel)
};

// Equipment data reference for default props
import { EQUIPMENT } from '../equipment/equipmentData';

// Reducer function
export function reducer(state, action) {
  switch (action.type) {
    case "BRING": {
      const id = state.nextId;
      const eq = EQUIPMENT.find(e => e.type === action.eqType);
      const props = { ...(eq?.defaultProps || {}) };
      if (action.eqType === "track") props.initialTilt = randTilt();
      props.inTray = true;
      return {
        ...state,
        labItems: [...state.labItems, { id, type: action.eqType, x: 0, y: 0, props }],
        nextId: id + 1
      };
    }

    case "PLACE":
      return {
        ...state,
        labItems: state.labItems.map(i =>
          i.id === action.id
            ? {
                ...i,
                x: action.x,
                y: action.y,
                props: {
                  ...i.props,
                  inTray: false,
                  velocity: 0,
                  velocityY: 0,
                  ...(action.fixedLength !== undefined ? { fixedLength: action.fixedLength } : {})
                }
              }
            : i
        )
      };

    case "RETURN":
      return {
        ...state,
        labItems: state.labItems.map(i =>
          i.id === action.id
            ? { ...i, props: { ...i.props, inTray: true, velocity: 0, velocityY: 0 } }
            : i
        ),
        strings: state.strings.filter(st => st.stringOwnerId !== action.id && st.targetId !== action.id),
        selectedId: state.selectedId === action.id ? null : state.selectedId
      };

    case "UPD":
      return {
        ...state,
        labItems: state.labItems.map(i =>
          i.id === action.id ? { ...i, ...action.u } : i
        )
      };

    case "REM":
      return {
        ...state,
        labItems: state.labItems.filter(i => i.id !== action.id),
        strings: state.strings.filter(st => st.stringOwnerId !== action.id && st.targetId !== action.id)
      };

    case "TAB":
      return { ...state, activeTab: action.tab };

    case "SELECT":
      return { ...state, selectedId: action.id };

    case "DESELECT":
      return { ...state, selectedId: null };

    case "ADD_STRING":
      // Simply add the string connection - fixedLength is set at PLACE time from user drawing
      return { ...state, strings: [...state.strings, { id: Date.now(), ...action.str }] };

    case "DEL_STRING":
      return { ...state, strings: state.strings.filter(st => st.id !== action.id) };

    case "NB_TOG":
      return { ...state, nbPanel: !state.nbPanel };

    case "NB_CLOSE":
      return { ...state, nbPanel: false };

    case "NB_ADD":
      return {
        ...state,
        notebookEntries: [...state.notebookEntries, { id: Date.now(), ts: new Date().toISOString(), ...action.entry }]
      };

    case "NB_UPD":
      return {
        ...state,
        notebookEntries: state.notebookEntries.map(e =>
          e.id === action.id ? { ...e, ...action.u } : e
        )
      };

    case "NB_DEL":
      return {
        ...state,
        notebookEntries: state.notebookEntries.filter(e => e.id !== action.id)
      };

    default:
      return state;
  }
}
