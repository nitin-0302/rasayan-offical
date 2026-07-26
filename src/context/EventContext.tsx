import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, getDocs, writeBatch } from 'firebase/firestore';
import { EVENTS, Event } from '../constants/events';
import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';

interface EventContextType {
  events: Event[];
  loading: boolean;
  updateEvent: (eventId: string, updatedFields: Partial<Event>) => Promise<void>;
  addEvent: (newEvent: Event) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<void>;
  resetEventsToDefault: () => Promise<void>;
}

const EventContext = createContext<EventContextType | undefined>(undefined);

export function EventProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<Event[]>(EVENTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const eventsCollectionRef = collection(db, 'events');
    
    // Realtime snapshot listener
    const unsubscribe = onSnapshot(eventsCollectionRef, async (snapshot) => {
      if (snapshot.empty) {
        console.log("Seeding events to Firestore...");
        try {
          // Put bootstrap documents inside firestore
          for (const evt of EVENTS) {
            await setDoc(doc(db, 'events', evt.id), evt);
          }
        } catch (err) {
          console.error("Error seeding events:", err);
        }
        setEvents(EVENTS);
        setLoading(false);
      } else {
        const loaded: Event[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Event;
          // Filter out lablable if present in Firestore
          if (
            !docSnap.id.toLowerCase().includes('lablable') && 
            !docSnap.id.toLowerCase().includes('labelable') &&
            !(data.name && data.name.toLowerCase().includes('lablable')) &&
            !(data.name && data.name.toLowerCase().includes('labelable'))
          ) {
            loaded.push({ id: docSnap.id, ...data });
          }
        });

        // Ensure all 12 official EVENTS are present
        const loadedIds = new Set(loaded.map(e => e.id));
        for (const defaultEvt of EVENTS) {
          if (!loadedIds.has(defaultEvt.id)) {
            loaded.push(defaultEvt);
          }
        }

        // Sort loaded events by category or name
        const sorted = loaded.sort((a, b) => {
          const indexA = EVENTS.findIndex(e => e.id === a.id);
          const indexB = EVENTS.findIndex(e => e.id === b.id);
          if (indexA !== -1 && indexB !== -1) {
            return indexA - indexB;
          }
          if (indexA !== -1) return -1;
          if (indexB !== -1) return 1;
          return (a.name || '').localeCompare(b.name || '');
        });
        
        setEvents(sorted);
        setLoading(false);
      }
    }, (error) => {
      console.error("Error listening to events collection:", error);
      setLoading(false);
      handleFirestoreError(error, OperationType.LIST, 'events');
    });

    return () => unsubscribe();
  }, []);

  const updateEvent = async (eventId: string, updatedFields: Partial<Event>) => {
    try {
      await setDoc(doc(db, 'events', eventId), updatedFields, { merge: true });
    } catch (err) {
      console.error("Error updating event detail:", err);
      handleFirestoreError(err, OperationType.UPDATE, `events/${eventId}`);
    }
  };

  const addEvent = async (newEvent: Event) => {
    try {
      await setDoc(doc(db, 'events', newEvent.id), newEvent);
    } catch (err) {
      console.error("Error adding new event:", err);
      handleFirestoreError(err, OperationType.CREATE, `events/${newEvent.id}`);
    }
  };

  const deleteEvent = async (eventId: string) => {
    try {
      await deleteDoc(doc(db, 'events', eventId));
    } catch (err) {
      console.error("Error deleting event:", err);
      handleFirestoreError(err, OperationType.DELETE, `events/${eventId}`);
    }
  };

  const resetEventsToDefault = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'events'));
      const batch = writeBatch(db);
      
      // Delete existing documents
      snapshot.forEach((d) => {
        batch.delete(doc(db, 'events', d.id));
      });
      await batch.commit();

      // Seed official 12 EVENTS
      const seedBatch = writeBatch(db);
      for (const evt of EVENTS) {
        seedBatch.set(doc(db, 'events', evt.id), evt);
      }
      await seedBatch.commit();
      setEvents(EVENTS);
    } catch (err) {
      console.error("Error resetting events to default:", err);
      handleFirestoreError(err, OperationType.WRITE, 'events');
    }
  };

  return (
    <EventContext.Provider value={{ events, loading, updateEvent, addEvent, deleteEvent, resetEventsToDefault }}>
      {children}
    </EventContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useEvents() {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error('useEvents must be used within an EventProvider');
  }
  return context;
}
