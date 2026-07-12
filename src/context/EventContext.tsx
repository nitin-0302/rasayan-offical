import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { EVENTS, Event } from '../constants/events';
import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';

interface EventContextType {
  events: Event[];
  loading: boolean;
  updateEvent: (eventId: string, updatedFields: Partial<Event>) => Promise<void>;
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

        // Check if any events defined in compiled constants are missing in the Firestore loaded events
        const missingEvents = EVENTS.filter(staticEvt => !loaded.some(e => e.id === staticEvt.id));
        if (missingEvents.length > 0) {
          console.log(`Detecting ${missingEvents.length} deleted/missing events. Restoring them to Firestore...`);
          // Load them immediately into UI context so they display right away
          loaded.push(...missingEvents);
          
          // Asynchronously restore each missing event to the Firestore database
          for (const missingEvt of missingEvents) {
            setDoc(doc(db, 'events', missingEvt.id), missingEvt).catch(err => {
              console.error(`Failed to restore event ${missingEvt.id}:`, err);
            });
          }
        }
        
        // Sort loaded events to match the sequence of categories / IDs in original EVENTS array
        const sorted = loaded.sort((a, b) => {
          const indexA = EVENTS.findIndex(e => e.id === a.id);
          const indexB = EVENTS.findIndex(e => e.id === b.id);
          if (indexA !== -1 && indexB !== -1) {
            return indexA - indexB;
          }
          return a.name.localeCompare(b.name);
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

  return (
    <EventContext.Provider value={{ events, loading, updateEvent }}>
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
