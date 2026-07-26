import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { EVENTS, Event } from '../constants/events';
import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';

interface EventContextType {
  events: Event[];
  loading: boolean;
  updateEvent: (eventId: string, updatedFields: Partial<Event>) => Promise<void>;
  addEvent: (newEvent: Event) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<void>;
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
          loaded.push({ id: docSnap.id, ...docSnap.data() } as Event);
        });

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

  return (
    <EventContext.Provider value={{ events, loading, updateEvent, addEvent, deleteEvent }}>
      {children}
    </EventContext.Provider>
  );
}

export function useEvents() {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error('useEvents must be used within an EventProvider');
  }
  return context;
}
