import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface PageData {
  id: string;
  title: string;
  content: string;
  updatedAt?: any;
}

export default function DynamicPage({ pageId: propPageId }: { pageId?: string }) {
  const { id: paramsId } = useParams();
  const pageId = propPageId || paramsId;
  const [page, setPage] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPage = async () => {
      if (!pageId) return;
      setLoading(true);
      try {
        const q = query(collection(db, 'pages'), where('id', '==', pageId), limit(1));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          setPage({ id: doc.id, ...doc.data() } as PageData);
        } else {
          setError('Page not found');
        }
      } catch (err) {
        console.error('Error fetching page:', err);
        setError('Failed to load page content');
      } finally {
        setLoading(false);
      }
    };

    fetchPage();
  }, [pageId]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-20 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="container mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto text-destructive">
          <AlertCircle size={40} />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">{error || 'Page Not Found'}</h1>
          <p className="text-muted-foreground">The page you're looking for doesn't exist or couldn't be loaded.</p>
        </div>
        <button onClick={() => window.history.back()} className="text-primary hover:underline font-bold">Go Back</button>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="container mx-auto px-4 py-12 max-w-4xl"
    >
      <div className="bg-card p-8 md:p-12 rounded-3xl border shadow-sm space-y-8">
        <div className="space-y-2 border-b pb-8">
          <h1 className="text-4xl font-bold">{page.title}</h1>
          {page.updatedAt && (
            <p className="text-sm text-muted-foreground">
              Last updated: {new Date(page.updatedAt.seconds * 1000).toLocaleDateString()}
            </p>
          )}
        </div>

        <div 
          className="prose prose-lg dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: page.content }}
        />
      </div>
    </motion.div>
  );
}
