import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type Firestore,
  type QueryConstraint,
  type WithFieldValue
} from "firebase/firestore";

export class FirestoreRepository<T extends { id: string; companyId: string }> {
  constructor(
    private readonly firestore: Firestore,
    private readonly collectionName: string
  ) {}

  collectionRef() {
    return collection(this.firestore, this.collectionName);
  }

  docRef(id: string) {
    return doc(this.firestore, this.collectionName, id);
  }

  async getById(id: string) {
    const snapshot = await getDoc(this.docRef(id));
    return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as T) : null;
  }

  async listByCompany(companyId: string, constraints: QueryConstraint[] = []) {
    const snapshot = await getDocs(
      query(
        this.collectionRef(),
        where("companyId", "==", companyId),
        ...constraints
      )
    );
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as T);
  }

  async listRecent(companyId: string, field = "createdAt", pageSize = 20) {
    return this.listByCompany(companyId, [orderBy(field, "desc"), limit(pageSize)]);
  }

  async create(input: Omit<T, "id" | "createdAt" | "updatedAt">) {
    const payload = {
      ...input,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    } as WithFieldValue<DocumentData>;
    const ref = await addDoc(this.collectionRef(), payload);
    return ref.id;
  }

  async set(id: string, input: WithFieldValue<DocumentData>) {
    await setDoc(this.docRef(id), input, { merge: true });
  }

  async update(id: string, input: DocumentData) {
    await updateDoc(this.docRef(id), {
      ...input,
      updatedAt: serverTimestamp()
    } as DocumentData);
  }

  async delete(id: string) {
    await deleteDoc(this.docRef(id));
  }
}
