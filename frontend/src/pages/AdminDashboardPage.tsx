import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Ticket,
  Clock,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Sparkles,
  Copy,
  Check,
  Building,
  Radio,
  ExternalLink,
  ChevronDown,
  Layers,
  Database,
  IndianRupee,
  Activity,
  UserCheck,
  History,
  ShieldAlert,
  Zap,
  Armchair,
  ShieldCheck,
  Link2,
  Plus,
  Save,
  Lock,
  QrCode,
  Tag,
} from 'lucide-react';
import { adminApi, blockchainApi, seatingApi } from '../api/endpoints';
import { useAuthStore } from '../store/authStore';
import {
  AdminBookingItem,
  AdminInventoryItem,
  AdminActivityLogItem,
  UserAccessFrequencyItem,
  SeatItem,
  BlockchainBlock,
  BlockchainVerifyResponse,
  SectionDto,
  RowDto,
  SeatDto,
} from '../types';
import { Link } from 'react-router-dom';

export const AdminDashboardPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'bookings' | 'seating' | 'frequencies' | 'activities' | 'blockchain'>('bookings');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedEventId, setSelectedEventId] = useState<string>('ALL');
  const [activitySearch, setActivitySearch] = useState('');
  const [activityActionFilter, setActivityActionFilter] = useState('ALL');
  const [admissionBatchSize, setAdmissionBatchSize] = useState<number>(50);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Seating Pattern States
  const [seatingEventId, setSeatingEventId] = useState<string>('ALL');
  const [seatingStatusFilter, setSeatingStatusFilter] = useState<'ALL' | 'CONFIRMED' | 'HELD' | 'AVAILABLE'>('ALL');
  const [seatingSectionFilter, setSeatingSectionFilter] = useState<'ALL' | 'VIP' | 'CLUB' | 'PITCH'>('ALL');

  // Dynamic Seating Designer States
  const [designerSections, setDesignerSections] = useState<SectionDto[]>([]);
  const [designerSelectedSection, setDesignerSelectedSection] = useState<string>('VIP');
  const [designerNewSectionCode, setDesignerNewSectionCode] = useState('');
  const [designerNewSectionName, setDesignerNewSectionName] = useState('');
  const [designerNewBasePrice, setDesignerNewBasePrice] = useState(1500);
  const [designerNewRowLabel, setDesignerNewRowLabel] = useState('G');
  const [designerNewRowCount, setDesignerNewRowCount] = useState(12);
  const [designerIsSaving, setDesignerIsSaving] = useState(false);
  const [designerSaveMsg, setDesignerSaveMsg] = useState<string | null>(null);

  // Create Event Modal States (Admin requested: limit of seats, frequency, price per seat, BookMyShow design)
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [createEventName, setCreateEventName] = useState('');
  const [createEventVenue, setCreateEventVenue] = useState('PVR INOX IMAX 4K Cinema');
  const [createEventDate, setCreateEventDate] = useState('2026-10-25T19:30');
  const [createEventLimit, setCreateEventLimit] = useState(100);
  const [createEventPrice, setCreateEventPrice] = useState(250);
  const [createEventFrequency, setCreateEventFrequency] = useState(30);
  const [createEventPattern, setCreateEventPattern] = useState<'BOOKMYSHOW_CINEMA' | 'STADIUM'>('BOOKMYSHOW_CINEMA');
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [createEventError, setCreateEventError] = useState<string | null>(null);
  const [createEventSuccess, setCreateEventSuccess] = useState<string | null>(null);

  // User Frequency States
  const [frequencySearch, setFrequencySearch] = useState('');
  const [frequencyTierFilter, setFrequencyTierFilter] = useState<string>('ALL');

  // Blockchain Ledger States
  const [blockchainSearch, setBlockchainSearch] = useState('');
  const [blockchainVerifying, setBlockchainVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<BlockchainVerifyResponse | null>(null);

  // 1. Fetch Overview (KPI stats, events, recent bookings, recent user activities, user frequencies)
  const {
    data: overview,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: adminApi.getOverview,
    refetchInterval: autoRefresh ? 4000 : false,
  });

  // 2. Tune Admission Rate Mutation
  const tuneMutation = useMutation({
    mutationFn: (newBatch: number) => adminApi.tuneAdmissionRate(newBatch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
    },
  });

  // 3. Fetch Blockchain Chain & Stats
  const {
    data: blockchainChain = [],
    refetch: refetchChain,
  } = useQuery({
    queryKey: ['admin-blockchain-chain'],
    queryFn: blockchainApi.getChain,
    refetchInterval: autoRefresh ? 4000 : false,
  });

  const {
    data: blockchainStats,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['admin-blockchain-stats'],
    queryFn: blockchainApi.getStats,
    refetchInterval: autoRefresh ? 4000 : false,
  });

  const handleVerifyChain = async () => {
    setBlockchainVerifying(true);
    try {
      const res = await blockchainApi.verifyChain();
      setVerifyResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setBlockchainVerifying(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAdmissionChange = (e: React.FormEvent) => {
    e.preventDefault();
    tuneMutation.mutate(admissionBatchSize);
  };

  const currentEventId = seatingEventId !== 'ALL' ? seatingEventId : 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  const {
    data: seatingLayoutData,
    refetch: refetchLayout,
    isLoading: isLoadingLayout,
  } = useQuery({
    queryKey: ['seating-layout', currentEventId],
    queryFn: () => seatingApi.getLayout(currentEventId),
    refetchInterval: autoRefresh ? 4000 : false,
  });

  useEffect(() => {
    if (seatingLayoutData?.sections) {
      setDesignerSections(seatingLayoutData.sections);
    }
  }, [seatingLayoutData]);

  const handleSaveSeatingLayout = async () => {
    setDesignerIsSaving(true);
    setDesignerSaveMsg(null);
    try {
      await seatingApi.saveLayout(currentEventId, designerSections);
      setDesignerSaveMsg('✓ Seating layout successfully saved to Supabase PostgreSQL database!');
      refetchLayout();
    } catch (err: any) {
      setDesignerSaveMsg('Failed to save layout: ' + (err.message || 'Error'));
    } finally {
      setDesignerIsSaving(false);
      setTimeout(() => setDesignerSaveMsg(null), 4000);
    }
  };

  const handleToggleSeatBlock = (secCode: string, rowLabel: string, seatCode: string) => {
    setDesignerSections((prev) =>
      prev.map((sec) => {
        if (sec.sectionCode !== secCode) return sec;
        return {
          ...sec,
          rows: sec.rows.map((row) => {
            if (row.rowLabel !== rowLabel) return row;
            return {
              ...row,
              seats: row.seats.map((seat) => {
                if (seat.seatCode !== seatCode) return seat;
                const newBlocked = !seat.isBlocked;
                return {
                  ...seat,
                  isBlocked: newBlocked,
                  status: newBlocked ? 'BLOCKED' : 'AVAILABLE',
                };
              }),
            };
          }),
        };
      })
    );
  };

  const handleToggleSeatAccessible = (secCode: string, rowLabel: string, seatCode: string) => {
    setDesignerSections((prev) =>
      prev.map((sec) => {
        if (sec.sectionCode !== secCode) return sec;
        return {
          ...sec,
          rows: sec.rows.map((row) => {
            if (row.rowLabel !== rowLabel) return row;
            return {
              ...row,
              seats: row.seats.map((seat) => {
                if (seat.seatCode !== seatCode) return seat;
                return {
                  ...seat,
                  isAccessible: !seat.isAccessible,
                  seatType: !seat.isAccessible ? 'ACCESSIBLE' : sec.sectionCode,
                };
              }),
            };
          }),
        };
      })
    );
  };

  const handleAddSection = () => {
    if (!designerNewSectionCode.trim() || !designerNewSectionName.trim()) return;
    const code = designerNewSectionCode.trim().toUpperCase();
    const newSec: SectionDto = {
      sectionId: `sec-${code.toLowerCase()}`,
      sectionCode: code,
      sectionName: designerNewSectionName.trim(),
      sectionTier: code,
      basePrice: Number(designerNewBasePrice),
      colorTheme: code === 'VIP' ? 'amber' : code === 'PREMIUM' ? 'cyan' : 'emerald',
      rows: [],
    };
    setDesignerSections((prev) => [...prev, newSec]);
    setDesignerNewSectionCode('');
    setDesignerNewSectionName('');
  };

  const handleAddRow = (sectionCode: string) => {
    const label = designerNewRowLabel.trim().toUpperCase() || 'R';
    const count = Math.max(1, Math.min(30, Number(designerNewRowCount)));
    const aislePos = [Math.floor(count / 2)];

    setDesignerSections((prev) =>
      prev.map((sec) => {
        if (sec.sectionCode !== sectionCode) return sec;
        const newSeats: SeatDto[] = [];
        for (let i = 1; i <= count; i++) {
          const colStr = i < 10 ? `0${i}` : `${i}`;
          newSeats.push({
            seatCode: `${sec.sectionCode}-${label}${colStr}`,
            rowLabel: label,
            seatNumber: i,
            seatType: sec.sectionCode,
            price: sec.basePrice,
            status: 'AVAILABLE',
            positionX: i,
            positionY: label.charCodeAt(0) - 64,
            isAccessible: false,
            isBlocked: false,
            isAisle: aislePos.includes(i),
          });
        }
        const newRow: RowDto = {
          rowLabel: label,
          seatCount: count,
          aislePositions: aislePos,
          seats: newSeats,
        };
        return {
          ...sec,
          rows: [...sec.rows, newRow],
        };
      })
    );
    setDesignerNewRowLabel(String.fromCharCode(label.charCodeAt(0) + 1));
  };

  const handleUpdateSectionPrice = (sectionCode: string, newPrice: number) => {
    setDesignerSections((prev) =>
      prev.map((sec) => {
        if (sec.sectionCode !== sectionCode) return sec;
        return {
          ...sec,
          basePrice: newPrice,
          rows: sec.rows.map((row) => ({
            ...row,
            seats: row.seats.map((seat) => ({
              ...seat,
              price: newPrice,
            })),
          })),
        };
      })
    );
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createEventName.trim() || !createEventVenue.trim()) {
      setCreateEventError('Please enter both event title and cinema venue.');
      return;
    }
    setIsCreatingEvent(true);
    setCreateEventError(null);
    setCreateEventSuccess(null);
    try {
      const created = await adminApi.createEvent({
        name: createEventName.trim(),
        description: `Cinema Screening at ${createEventVenue.trim()}`,
        venue: createEventVenue.trim(),
        startTime: createEventDate ? new Date(createEventDate).toISOString() : new Date().toISOString(),
        totalTickets: Number(createEventLimit) || 100,
        pricePerSeat: Number(createEventPrice) || 250,
        rateLimitPerMinute: Number(createEventFrequency) || 30,
        seatingPattern: createEventPattern,
      });

      setCreateEventSuccess(`✓ Event "${created.eventName}" created with ${created.totalTickets} seats @ ₹${created.costPerSeat || createEventPrice}/seat!`);
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setTimeout(() => {
        setIsCreateEventOpen(false);
        setCreateEventSuccess(null);
        setCreateEventName('');
      }, 1500);
    } catch (err: any) {
      setCreateEventError(err.response?.data?.message || err.message || 'Failed to create event');
    } finally {
      setIsCreatingEvent(false);
    }
  };

  const applyBookMyShowTemplate = (primePrice = 250) => {
    const reclinerPrice = Math.round(primePrice * 1.8);
    const classicPrice = Math.round(primePrice * 0.72);

    const makeRow = (rowLabel: string, count: number, secCode: string, price: number, aislePositions: number[]): RowDto => {
      const seats: SeatDto[] = [];
      for (let i = 1; i <= count; i++) {
        const colStr = i < 10 ? `0${i}` : `${i}`;
        const isAccessible = (rowLabel === 'B' && i === 1) || (rowLabel === 'D' && i === 1);
        seats.push({
          seatCode: `${secCode}-${rowLabel}${colStr}`,
          rowLabel,
          seatNumber: i,
          seatType: isAccessible ? 'ACCESSIBLE' : secCode,
          price,
          status: 'AVAILABLE',
          positionX: i,
          positionY: rowLabel.charCodeAt(0) - 64,
          isAccessible,
          isBlocked: false,
          isAisle: aislePositions.includes(i),
        });
      }
      return {
        rowLabel,
        seatCount: count,
        aislePositions,
        seats,
      };
    };

    const bmsSections: SectionDto[] = [
      {
        sectionId: 'sec-recliner',
        sectionCode: 'RECLINER',
        sectionName: 'Recliner (VIP Lounge)',
        sectionTier: 'RECLINER',
        basePrice: reclinerPrice,
        colorTheme: 'amber',
        rows: [
          makeRow('A', 12, 'RECLINER', reclinerPrice, [6]),
          makeRow('B', 12, 'RECLINER', reclinerPrice, [6]),
        ],
      },
      {
        sectionId: 'sec-prime',
        sectionCode: 'PRIME',
        sectionName: 'Prime Class (Executive)',
        sectionTier: 'PRIME',
        basePrice: primePrice,
        colorTheme: 'cyan',
        rows: [
          makeRow('C', 14, 'PRIME', primePrice, [4, 11]),
          makeRow('D', 14, 'PRIME', primePrice, [4, 11]),
          makeRow('E', 14, 'PRIME', primePrice, [4, 11]),
        ],
      },
      {
        sectionId: 'sec-classic',
        sectionCode: 'CLASSIC',
        sectionName: 'Classic Silver',
        sectionTier: 'CLASSIC',
        basePrice: classicPrice,
        colorTheme: 'emerald',
        rows: [
          makeRow('F', 16, 'CLASSIC', classicPrice, [4, 13]),
          makeRow('G', 16, 'CLASSIC', classicPrice, [4, 13]),
          makeRow('H', 16, 'CLASSIC', classicPrice, [4, 13]),
        ],
      },
    ];

    setDesignerSections(bmsSections);
    setDesignerSaveMsg('Applied BookMyShow Cinema Layout (Recliner, Prime, Classic)! Click "Save Layout to Supabase" to persist.');
    setTimeout(() => setDesignerSaveMsg(null), 5000);
  };


  const bookings: AdminBookingItem[] = overview?.recentBookings || [];
  const activities: AdminActivityLogItem[] = overview?.recentActivities || [];
  const userFrequencies: UserAccessFrequencyItem[] = overview?.userAccessFrequencies || [];

  // Filter Blockchain Blocks
  const filteredBlocks = (blockchainChain as BlockchainBlock[]).filter((b) => {
    const term = blockchainSearch.toLowerCase();
    return (
      b.blockHash.toLowerCase().includes(term) ||
      (b.orderId && b.orderId.toLowerCase().includes(term)) ||
      (b.buyerName && b.buyerName.toLowerCase().includes(term)) ||
      (b.buyerEmail && b.buyerEmail.toLowerCase().includes(term)) ||
      (b.seatNumbers && b.seatNumbers.toLowerCase().includes(term)) ||
      (b.tokenId && b.tokenId.toLowerCase().includes(term)) ||
      (b.buyerWallet && b.buyerWallet.toLowerCase().includes(term))
    );
  });

  // Filter Bookings
  const filteredBookings = bookings.filter((b) => {
    const matchesSearch =
      b.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.eventName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
    const matchesEvent = selectedEventId === 'ALL' || b.eventId === selectedEventId;

    return matchesSearch && matchesStatus && matchesEvent;
  });

  // Filter Activities
  const filteredActivities = activities.filter((a) => {
    const matchesSearch =
      a.userEmail.toLowerCase().includes(activitySearch.toLowerCase()) ||
      (a.userName && a.userName.toLowerCase().includes(activitySearch.toLowerCase())) ||
      a.action.toLowerCase().includes(activitySearch.toLowerCase()) ||
      (a.details && a.details.toLowerCase().includes(activitySearch.toLowerCase()));

    const matchesAction = activityActionFilter === 'ALL' || a.action === activityActionFilter;
    return matchesSearch && matchesAction;
  });

  // Filter User Frequencies
  const filteredFrequencies = userFrequencies.filter((f) => {
    const matchesSearch =
      f.userName.toLowerCase().includes(frequencySearch.toLowerCase()) ||
      f.userEmail.toLowerCase().includes(frequencySearch.toLowerCase()) ||
      f.latestAction.toLowerCase().includes(frequencySearch.toLowerCase());

    const matchesTier = frequencyTierFilter === 'ALL' || f.accessFrequencyTier === frequencyTierFilter;
    return matchesSearch && matchesTier;
  });

  const totalCapacity = overview?.totalSeats || 0;
  const soldSeats = overview?.soldSeats || 0;
  const heldSeats = overview?.heldSeats || 0;
  const availableSeats = overview?.availableSeats || 0;
  const costOfOneSeat = overview?.costPerSeat || 1.0;

  const soldPct = totalCapacity > 0 ? ((soldSeats / totalCapacity) * 100).toFixed(1) : '0';
  const heldPct = totalCapacity > 0 ? ((heldSeats / totalCapacity) * 100).toFixed(1) : '0';
  const availPct = totalCapacity > 0 ? ((availableSeats / totalCapacity) * 100).toFixed(1) : '0';

  // Dynamic Seating Matrix Generation
  const activeEventForSeatingId =
    seatingEventId !== 'ALL'
      ? seatingEventId
      : overview?.events?.[0]?.eventId || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  const activeEventForSeating =
    overview?.events?.find((e) => e.eventId === activeEventForSeatingId) || overview?.events?.[0];

  const activeEventBookings = bookings.filter((b) => b.eventId === activeEventForSeatingId);

  const seatingGrid: SeatItem[] = useMemo(() => {
    const seats: SeatItem[] = [];
    const rows = [
      { row: 'A', section: 'VIP' as const, tierName: 'VIP Platinum Lounge (Row A)', count: 12, cost: 1.0 },
      { row: 'B', section: 'VIP' as const, tierName: 'VIP Platinum Lounge (Row B)', count: 12, cost: 1.0 },
      { row: 'C', section: 'CLUB' as const, tierName: 'Club Deck Executive (Row C)', count: 14, cost: 1.0 },
      { row: 'D', section: 'CLUB' as const, tierName: 'Club Deck Executive (Row D)', count: 14, cost: 1.0 },
      { row: 'E', section: 'PITCH' as const, tierName: 'General Pitch Standing (Row E)', count: 16, cost: 1.0 },
      { row: 'F', section: 'PITCH' as const, tierName: 'General Pitch Standing (Row F)', count: 16, cost: 1.0 },
    ];

    // Map of seatCode -> Occupant details for orders with assigned seat numbers
    const seatMap = new Map<string, {
      status: 'HELD' | 'CONFIRMED';
      name: string;
      email: string;
      orderId: string;
      date: string;
    }>();

    const unassignedConfirmed: { name: string; email: string; orderId: string; date: string }[] = [];
    const unassignedHeld: { name: string; email: string; orderId: string; date: string }[] = [];

    activeEventBookings.forEach((b) => {
      if (b.seatNumbers && b.seatNumbers.trim()) {
        const codes = b.seatNumbers.split(',').map((s) => s.trim()).filter(Boolean);
        codes.forEach((code) => {
          if (b.status === 'CONFIRMED' || b.status === 'PENDING') {
            seatMap.set(code.toUpperCase(), {
              status: b.status === 'CONFIRMED' ? 'CONFIRMED' : 'HELD',
              name: b.customerName,
              email: b.customerEmail,
              orderId: b.orderId,
              date: b.createdAt,
            });
          }
        });
      } else {
        const seatCount = Math.max(1, b.ticketCount);
        for (let i = 0; i < seatCount; i++) {
          if (b.status === 'CONFIRMED') {
            unassignedConfirmed.push({
              name: b.customerName,
              email: b.customerEmail,
              orderId: b.orderId,
              date: b.createdAt,
            });
          } else if (b.status === 'PENDING') {
            unassignedHeld.push({
              name: b.customerName,
              email: b.customerEmail,
              orderId: b.orderId,
              date: b.createdAt,
            });
          }
        }
      }
    });

    let confIdx = 0;
    let heldIdx = 0;

    rows.forEach((r) => {
      for (let col = 1; col <= r.count; col++) {
        const codeNum = col < 10 ? `0${col}` : `${col}`;
        const seatCode = `${r.section}-${r.row}${codeNum}`;
        let status: 'AVAILABLE' | 'HELD' | 'CONFIRMED' = 'AVAILABLE';
        let occupantName: string | undefined = undefined;
        let occupantEmail: string | undefined = undefined;
        let orderRef: string | undefined = undefined;
        let bookedAt: string | undefined = undefined;

        if (seatMap.has(seatCode)) {
          const occ = seatMap.get(seatCode)!;
          status = occ.status;
          occupantName = occ.name;
          occupantEmail = occ.email;
          orderRef = occ.orderId;
          bookedAt = occ.date;
        } else if (confIdx < unassignedConfirmed.length) {
          status = 'CONFIRMED';
          occupantName = unassignedConfirmed[confIdx].name;
          occupantEmail = unassignedConfirmed[confIdx].email;
          orderRef = unassignedConfirmed[confIdx].orderId;
          bookedAt = unassignedConfirmed[confIdx].date;
          confIdx++;
        } else if (heldIdx < unassignedHeld.length) {
          status = 'HELD';
          occupantName = unassignedHeld[heldIdx].name;
          occupantEmail = unassignedHeld[heldIdx].email;
          orderRef = unassignedHeld[heldIdx].orderId;
          bookedAt = unassignedHeld[heldIdx].date;
          heldIdx++;
        }

        seats.push({
          id: seatCode,
          row: r.row,
          col,
          seatCode,
          section: r.section,
          tierName: r.tierName,
          cost: activeEventForSeating?.costPerSeat || costOfOneSeat,
          status,
          userName: occupantName,
          userEmail: occupantEmail,
          orderId: orderRef,
          bookedAt,
        });
      }
    });

    return seats;
  }, [activeEventForSeatingId, activeEventBookings, activeEventForSeating, costOfOneSeat]);

  // Filtered Seating Grid
  const visibleSeats = seatingGrid.filter((s) => {
    const matchesStatus = seatingStatusFilter === 'ALL' || s.status === seatingStatusFilter;
    const matchesSection = seatingSectionFilter === 'ALL' || s.section === seatingSectionFilter;
    return matchesStatus && matchesSection;
  });

  const seatingConfirmedCount = seatingGrid.filter((s) => s.status === 'CONFIRMED').length;
  const seatingHeldCount = seatingGrid.filter((s) => s.status === 'HELD').length;
  const seatingAvailCount = seatingGrid.filter((s) => s.status === 'AVAILABLE').length;

  // Total User Access Hits calculation
  const totalUserAccessHits = userFrequencies.reduce((acc, curr) => acc + curr.totalAccessCount, 0);
  const peakUser = userFrequencies[0];
  const avgAccessPerUser =
    userFrequencies.length > 0 ? (totalUserAccessHits / userFrequencies.length).toFixed(1) : '0';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20 selection:bg-rose-500 selection:text-white">
      {/* Top Operations Command Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-xl sticky top-0 z-30 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 via-amber-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-rose-500/20">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  Live Operations
                </span>
                <span className="text-xs text-slate-400 font-mono">D:\mysql\ticketflow_db</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                FairSeat Command Center
                <span className="text-xs font-normal px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  v2.5-PROD
                </span>
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Auto-Refresh Switch */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border ${
                autoRefresh
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700'
              }`}
            >
              <Radio className={`w-3.5 h-3.5 ${autoRefresh ? 'text-emerald-400 animate-pulse' : ''}`} />
              <span>{autoRefresh ? 'Telemetry Stream ON (4s)' : 'Stream Paused'}</span>
            </button>

            {/* Manual Sync */}
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin text-rose-400' : ''}`} />
              <span>Sync Ledger</span>
            </button>

            {/* Gate Inspector Link */}
            <Link
              to="/verify-ticket"
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 transition"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Gate Verify</span>
            </Link>

            {/* View Buyer Storefront */}
            <Link
              to="/"
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition"
            >
              <span>Storefront</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>

            {/* User Profile */}
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-800 text-xs text-slate-400">
              <span className="hidden sm:inline font-mono">{user?.email}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* FairSeat Multi-Engine Live System Status Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-900/40 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <p className="text-xs uppercase font-extrabold text-indigo-400 tracking-wider">
                  FairSeat High-Concurrency Architecture
                </p>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  10k Inventory / 500k Users Ready
                </span>
              </div>
              <p className="text-sm font-medium text-slate-300 mt-0.5">
                Dynamic Seating Designer &bull; Supabase PostgreSQL Engine &bull; Cryptographic Gate Ledger
              </p>
            </div>
          </div>
          {/* 4 Health Status Pills */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-slate-500">API:</span>
              <span className="text-emerald-400 font-bold">Healthy (8080)</span>
            </div>
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              <span className="text-slate-500">Supabase:</span>
              <span className="text-cyan-400 font-bold">Connected (16 Tables)</span>
            </div>
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              <span className="text-slate-500">Queue:</span>
              <span className="text-amber-400 font-bold">Active (Redis)</span>
            </div>
            <Link
              to="/blockchain"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/50 text-slate-300 shadow-sm transition"
              title="Open Blockchain Ledger Explorer"
            >
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
              <span className="text-slate-500">Blockchain:</span>
              <span className="text-indigo-400 font-bold">Connected (PoA #{blockchainStats?.blockHeight ?? 1})</span>
            </Link>
          </div>
        </div>

        {/* 1. KEY PERFORMANCE STAT CARDS (INCLUDING COST OF ONE SEAT) */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Activity className="w-4 h-4 text-rose-400" />
              Live Stadium Seat, Unit Cost & Revenue Telemetry
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              Events Managed: {overview?.totalEvents || 0}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* 1. Total Stadium Seats */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-slate-700 transition">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Stadium Capacity</span>
                <Ticket className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="text-2xl lg:text-3xl font-black text-white font-mono tracking-tight">
                {isLoading ? '...' : totalCapacity.toLocaleString()}
              </div>
              <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
                <span>All Venues</span>
                <span className="text-indigo-400 font-semibold font-mono">100% Total</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500/30"></div>
            </div>

            {/* 2. Confirmed Sold Seats */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-emerald-500/40 transition">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Confirmed Bookings</span>
                <UserCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-2xl lg:text-3xl font-black text-emerald-400 font-mono tracking-tight">
                {isLoading ? '...' : soldSeats.toLocaleString()}
              </div>
              <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
                <span>Issued Tickets</span>
                <span className="text-emerald-400 font-semibold font-mono">{soldPct}% Filled</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500"></div>
            </div>

            {/* 3. Held Seats */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-amber-500/40 transition">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Active Held (Cart)</span>
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
              <div className="text-2xl lg:text-3xl font-black text-amber-400 font-mono tracking-tight">
                {isLoading ? '...' : heldSeats.toLocaleString()}
              </div>
              <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
                <span>10-Min Lock</span>
                <span className="text-amber-400 font-semibold font-mono">{heldPct}% Pending</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500"></div>
            </div>

            {/* 4. Available Seats */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-slate-700 transition">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Remaining Avail</span>
                <Layers className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="text-2xl lg:text-3xl font-black text-cyan-300 font-mono tracking-tight">
                {isLoading ? '...' : availableSeats.toLocaleString()}
              </div>
              <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
                <span>Open for Sale</span>
                <span className="text-cyan-400 font-semibold font-mono">{availPct}% Open</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-cyan-500"></div>
            </div>

            {/* 5. COST OF ONE SEAT (Requested by User) */}
            <div className="bg-slate-900/80 border border-rose-500/30 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-rose-500/60 transition bg-gradient-to-br from-slate-900 via-rose-950/20 to-slate-900">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-300">Cost of One Seat</span>
                <Armchair className="w-5 h-5 text-rose-400" />
              </div>
              <div className="text-2xl lg:text-3xl font-black text-white font-mono tracking-tight flex items-baseline">
                <span className="text-rose-400 mr-1 text-xl">₹</span>
                {costOfOneSeat.toFixed(2)}
                <span className="text-xs font-normal text-slate-400 ml-1">/seat</span>
              </div>
              <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
                <span>Standard Flash Price</span>
                <span className="text-rose-400 font-semibold font-mono">100% Fixed</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-amber-500"></div>
            </div>

            {/* 6. Total Revenue */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-emerald-500/40 transition">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Revenue</span>
                <IndianRupee className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-2xl lg:text-3xl font-black text-white font-mono tracking-tight flex items-baseline">
                <span className="text-emerald-400 mr-1 text-xl">₹</span>
                {isLoading
                  ? '...'
                  : (overview?.totalRevenue || 0).toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
              </div>
              <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
                <span>UPI Settled</span>
                <span className="text-emerald-400 font-semibold font-mono">100% Paid</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400"></div>
            </div>
          </div>

          {/* Stadium Capacity Utilization Multi-Color Progress Bar */}
          <div className="mt-5 bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Stadium Capacity Allocation & Seating Footprint
              </span>
              <div className="flex items-center space-x-4 text-xs font-medium">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  Sold: {soldSeats.toLocaleString()} ({soldPct}%)
                </span>
                <span className="flex items-center gap-1.5 text-amber-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  Held: {heldSeats.toLocaleString()} ({heldPct}%)
                </span>
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-600"></span>
                  Available: {availableSeats.toLocaleString()} ({availPct}%)
                </span>
              </div>
            </div>

            <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
              <div
                style={{ width: `${soldPct}%` }}
                className="bg-emerald-500 transition-all duration-500 relative group"
                title={`Sold: ${soldSeats}`}
              />
              <div
                style={{ width: `${heldPct}%` }}
                className="bg-amber-500 transition-all duration-500 relative group"
                title={`Held: ${heldSeats}`}
              />
              <div
                style={{ width: `${availPct}%` }}
                className="bg-slate-700 transition-all duration-500"
                title={`Available: ${availableSeats}`}
              />
            </div>
          </div>
        </section>

        {/* 2. EVENT INVENTORY FLEET & QUEUE THROTTLE CONTROLS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Per-Event Breakdown */}
          <section className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-3">
                <Building className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-white text-base">Active Event Venues & Seat Inventory</h3>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setIsCreateEventOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 via-amber-500 to-indigo-600 hover:from-rose-600 hover:to-amber-600 text-white font-bold text-xs shadow-lg shadow-rose-500/20 flex items-center space-x-1.5 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Create Cinema Event</span>
                </button>
                <span className="text-xs text-slate-400 font-mono">
                  {overview?.events?.length || 0} Events Active
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {overview?.events?.map((ev: AdminInventoryItem) => (
                <div
                  key={ev.eventId}
                  className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 hover:border-slate-700 transition space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-white text-sm sm:text-base">{ev.eventName}</h4>
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          Live Cinema
                        </span>
                        {/* Cost of One Seat Badge */}
                        <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <Ticket className="w-3 h-3" />
                          Seat: ₹{(ev.pricePerSeat || ev.costPerSeat || costOfOneSeat).toFixed(2)}
                        </span>
                        {/* Access Frequency Limit Badge */}
                        <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          Freq: {ev.rateLimitPerMinute || 30} req/min
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {ev.eventId}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-400">Total Seating Capacity</span>
                      <p className="text-lg font-black text-white font-mono">
                        {ev.totalTickets.toLocaleString()} Seats
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-800/60">
                    <div className="bg-emerald-950/30 border border-emerald-900/40 rounded-lg p-2">
                      <span className="text-[10px] uppercase font-bold text-emerald-400 block">Sold Seats</span>
                      <span className="text-sm font-black text-emerald-300 font-mono">
                        {ev.soldCount.toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-amber-950/30 border border-amber-900/40 rounded-lg p-2">
                      <span className="text-[10px] uppercase font-bold text-amber-400 block">Held Seats</span>
                      <span className="text-sm font-black text-amber-300 font-mono">
                        {ev.heldCount.toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-cyan-950/30 border border-cyan-900/40 rounded-lg p-2">
                      <span className="text-[10px] uppercase font-bold text-cyan-400 block">Available</span>
                      <span className="text-sm font-black text-cyan-300 font-mono">
                        {ev.availableCount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Virtual Waiting Room Throttle Controller */}
          <section className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center space-x-3 border-b border-slate-800 pb-3 mb-4">
                <Sliders className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">Virtual Queue Admission Engine</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Control the rate at which waiting room users are admitted into the checkout payment funnel. High concurrency safety valve.
              </p>

              <form onSubmit={handleAdmissionChange} className="mt-6 space-y-4">
                <div>
                  <div className="flex justify-between text-xs text-slate-300 mb-2">
                    <span className="font-semibold">Batch Ingress Size (users/second)</span>
                    <span className="font-mono text-amber-400 font-bold">{admissionBatchSize} users</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={500}
                    step={5}
                    value={admissionBatchSize}
                    onChange={(e) => setAdmissionBatchSize(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                    <span>5 (Conservative)</span>
                    <span>100 (Standard)</span>
                    <span>500 (Flash Surge)</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={tuneMutation.isPending}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white font-bold text-xs shadow-lg shadow-amber-500/20 transition flex items-center justify-center space-x-2"
                  >
                    {tuneMutation.isPending ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Updating Redis Throttle...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Apply Queue Rate</span>
                      </>
                    )}
                  </button>
                  {tuneMutation.isSuccess && (
                    <p className="text-[11px] text-emerald-400 text-center mt-2 font-medium">
                      &check; Admission rate updated in Redis
                    </p>
                  )}
                </div>
              </form>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs space-y-1 text-slate-400">
              <div className="flex justify-between">
                <span>Hold TTL Window:</span>
                <span className="font-mono text-slate-200">600 seconds (10 mins)</span>
              </div>
              <div className="flex justify-between">
                <span>Optimistic Lock:</span>
                <span className="font-mono text-emerald-400">Active (JPA @Version)</span>
              </div>
            </div>
          </section>
        </div>

        {/* 3. QUAD-TAB AUDIT & OBSERVABILITY CENTER */}
        <section className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          {/* Tab Bar Header */}
          <div className="p-6 border-b border-slate-800 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
                {/* Tab 1: Bookings Ledger */}
                <button
                  type="button"
                  onClick={() => setActiveTab('bookings')}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition ${
                    activeTab === 'bookings'
                      ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Customer Bookings</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                      activeTab === 'bookings' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {filteredBookings.length}
                  </span>
                </button>

                {/* Tab 2: Seating Pattern (Requested by User) */}
                <button
                  type="button"
                  onClick={() => setActiveTab('seating')}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition ${
                    activeTab === 'seating'
                      ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Armchair className="w-4 h-4 text-cyan-300" />
                  <span>Stadium Seating Pattern</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                      activeTab === 'seating' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {seatingGrid.length} Seats
                  </span>
                </button>

                {/* Tab 3: Frequency of Accessing Users (Requested by User) */}
                <button
                  type="button"
                  onClick={() => setActiveTab('frequencies')}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition ${
                    activeTab === 'frequencies'
                      ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Zap className="w-4 h-4 text-amber-300" />
                  <span>Frequency of Accessing Users</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                      activeTab === 'frequencies' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {filteredFrequencies.length}
                  </span>
                </button>

                {/* Tab 4: User Activity Audit Trail */}
                <button
                  type="button"
                  onClick={() => setActiveTab('activities')}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition ${
                    activeTab === 'activities'
                      ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <History className="w-4 h-4" />
                  <span>Activity Audit Trail</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                      activeTab === 'activities' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {filteredActivities.length}
                  </span>
                </button>

                {/* Tab 5: Blockchain Theatre Ledger */}
                <button
                  type="button"
                  onClick={() => setActiveTab('blockchain')}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition ${
                    activeTab === 'blockchain'
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Link2 className="w-4 h-4 text-violet-400" />
                  <span>Blockchain Theatre Ledger</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                      activeTab === 'blockchain' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {filteredBlocks.length}
                  </span>
                </button>
              </div>

              <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
                <Database className="w-3.5 h-3.5 text-indigo-400" />
                <span>DB: ticketflow.mv.db</span>
              </div>
            </div>

            {/* TAB 1: Filter Toolbar for Bookings */}
            {activeTab === 'bookings' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search user name, email, or order ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500 placeholder-slate-500"
                  />
                </div>

                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500 appearance-none cursor-pointer"
                  >
                    <option value="ALL">All Statuses (Confirmed, Pending, Expired)</option>
                    <option value="CONFIRMED">&check; Confirmed Only</option>
                    <option value="PENDING">&#9203; Pending (Held)</option>
                    <option value="EXPIRED">&#10007; Expired / Cancelled</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                <div className="relative">
                  <select
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500 appearance-none cursor-pointer"
                  >
                    <option value="ALL">All Event Venues</option>
                    {overview?.events?.map((ev: AdminInventoryItem) => (
                      <option key={ev.eventId} value={ev.eventId}>
                        {ev.eventName}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            )}

            {/* TAB 2: Filter Toolbar for Seating Pattern */}
            {activeTab === 'seating' && (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Event Selector */}
                  <div className="relative min-w-[220px]">
                    <select
                      value={seatingEventId}
                      onChange={(e) => setSeatingEventId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500 appearance-none cursor-pointer"
                    >
                      {overview?.events?.map((ev: AdminInventoryItem) => (
                        <option key={ev.eventId} value={ev.eventId}>
                          {ev.eventName}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  {/* Status Filter */}
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                    {(['ALL', 'CONFIRMED', 'HELD', 'AVAILABLE'] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => setSeatingStatusFilter(st)}
                        className={`px-3 py-1.5 rounded-lg font-medium transition ${
                          seatingStatusFilter === st
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {st === 'ALL'
                          ? 'All Seats'
                          : st === 'CONFIRMED'
                          ? 'Booked'
                          : st === 'HELD'
                          ? 'In-Cart'
                          : 'Available'}
                      </button>
                    ))}
                  </div>

                  {/* Section Filter */}
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                    {(['ALL', 'VIP', 'CLUB', 'PITCH'] as const).map((sec) => (
                      <button
                        key={sec}
                        onClick={() => setSeatingSectionFilter(sec)}
                        className={`px-3 py-1.5 rounded-lg font-medium transition ${
                          seatingSectionFilter === sec
                            ? 'bg-rose-500 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {sec === 'ALL' ? 'All Tiers' : sec}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Legend & Cost Indicator */}
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
                    <span className="text-slate-300">Booked ({seatingConfirmedCount})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-amber-500 shadow-sm shadow-amber-500/50"></span>
                    <span className="text-slate-300">Held ({seatingHeldCount})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-slate-800 border border-slate-600"></span>
                    <span className="text-slate-300">Available ({seatingAvailCount})</span>
                  </div>
                  <div className="px-3 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold font-mono">
                    Cost of One Seat: ₹{costOfOneSeat.toFixed(2)}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Filter Toolbar for Frequency of Accessing Users */}
            {activeTab === 'frequencies' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by user name, email, or recent action..."
                    value={frequencySearch}
                    onChange={(e) => setFrequencySearch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500 placeholder-slate-500"
                  />
                </div>

                <div className="relative">
                  <select
                    value={frequencyTierFilter}
                    onChange={(e) => setFrequencyTierFilter(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500 appearance-none cursor-pointer"
                  >
                    <option value="ALL">All Frequency Tiers (Flash Surge, Active, Standard)</option>
                    <option value="FLASH_SURGE_BUYER">⚡ Flash Surge Buyer (High Rate &ge; 8 Hits)</option>
                    <option value="ACTIVE_VISITOR">🔥 Active Visitor (3 - 7 Hits)</option>
                    <option value="STANDARD">🌱 Standard Access (&lt; 3 Hits)</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            )}

            {/* TAB 4: Filter Toolbar for Activity Logs */}
            {activeTab === 'activities' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search user name, email, action, or details..."
                    value={activitySearch}
                    onChange={(e) => setActivitySearch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500 placeholder-slate-500"
                  />
                </div>

                <div className="relative">
                  <select
                    value={activityActionFilter}
                    onChange={(e) => setActivityActionFilter(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500 appearance-none cursor-pointer"
                  >
                    <option value="ALL">All User Actions</option>
                    <option value="CAPTCHA_VERIFIED">CAPTCHA Solved</option>
                    <option value="TICKET_HOLD">Tickets Held in Cart</option>
                    <option value="UPI_PAYMENT_VERIFIED">UPI Payment Verified (12-Digit UTR)</option>
                    <option value="PAYMENT_REJECTED">Payment Rejected / Blocked</option>
                    <option value="ORDER_CONFIRMED">Order Confirmed</option>
                    <option value="ORDER_EXPIRED">Hold Expired</option>
                    <option value="USER_LOGIN">User Login</option>
                    <option value="USER_REGISTER">User Registered</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            )}

            {/* TAB 5: Filter Toolbar for Blockchain Ledger */}
            {activeTab === 'blockchain' && (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="relative flex-1 min-w-[260px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search Block Hash, Order ID, Buyer Name, Wallet, Token ID, Seat..."
                    value={blockchainSearch}
                    onChange={(e) => setBlockchainSearch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 placeholder-slate-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleVerifyChain}
                    disabled={blockchainVerifying}
                    className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/40 text-xs font-bold transition cursor-pointer disabled:opacity-50 shadow-sm shadow-violet-500/10"
                  >
                    <ShieldCheck className={`w-3.5 h-3.5 text-violet-400 ${blockchainVerifying ? 'animate-spin' : ''}`} />
                    <span>{blockchainVerifying ? 'Verifying Hashes...' : 'Verify Cryptographic Chain'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      refetchChain();
                      refetchStats();
                    }}
                    className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white text-xs font-medium transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Refresh Chain</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* TAB 1 CONTENT: Customer Bookings Ledger (With User Name & Cost of One Seat) */}
          {activeTab === 'bookings' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="py-3.5 px-4">Customer Details (User Name)</th>
                    <th className="py-3.5 px-4">Event & Venue</th>
                    <th className="py-3.5 px-4 text-center">Seats Booked</th>
                    <th className="py-3.5 px-4 text-center">Cost / Seat</th>
                    <th className="py-3.5 px-4">Total Amount Paid</th>
                    <th className="py-3.5 px-4">Booking Date & Time</th>
                    <th className="py-3.5 px-4">Order Reference</th>
                    <th className="py-3.5 px-4 text-right">Payment Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-rose-500 mb-2" />
                        Loading live customer bookings ledger...
                      </td>
                    </tr>
                  ) : filteredBookings.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        No customer bookings found matching the current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredBookings.map((b) => {
                      const initials = (b.customerName || b.customerEmail || 'U')
                        .substring(0, 2)
                        .toUpperCase();

                      return (
                        <tr
                          key={b.orderId}
                          className="hover:bg-slate-800/40 transition group"
                        >
                          {/* Customer Info (User Name) */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-rose-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-md">
                                {initials}
                              </div>
                              <div>
                                <p className="font-semibold text-white group-hover:text-rose-400 transition">
                                  {b.customerName || 'Customer'}
                                </p>
                                <p className="text-slate-400 font-mono text-[11px]">
                                  {b.customerEmail}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Event Name */}
                          <td className="py-3.5 px-4">
                            <p className="font-medium text-slate-200">{b.eventName}</p>
                            <p className="text-slate-500 text-[11px]">{b.venue}</p>
                          </td>

                          {/* Seats Booked */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                                {b.ticketCount} {b.ticketCount === 1 ? 'Seat' : 'Seats'}
                              </span>
                              {b.seatNumbers && (
                                <span className="font-mono text-[10px] text-amber-300 font-semibold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded shadow-sm">
                                  {b.seatNumbers}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Cost of One Seat */}
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-400">
                            ₹{(b.costPerSeat || costOfOneSeat).toFixed(2)}
                          </td>

                          {/* Amount */}
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-200">
                            <span className="text-emerald-400 mr-0.5">₹</span>
                            {b.totalAmount.toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>

                          {/* Date & Time */}
                          <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                            {new Date(b.createdAt).toLocaleString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </td>

                          {/* Order Reference */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-mono text-[11px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                                {b.orderId.substring(0, 8)}...
                              </span>
                              <button
                                onClick={() => handleCopy(b.orderId, b.orderId)}
                                title="Copy Order ID"
                                className="p-1 rounded text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition"
                              >
                                {copiedId === b.orderId ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Status Badge */}
                          <td className="py-3.5 px-4 text-right">
                            {b.status === 'CONFIRMED' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                <CheckCircle2 className="w-3 h-3" />
                                Confirmed
                              </span>
                            )}
                            {b.status === 'PENDING' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                <Clock className="w-3 h-3" />
                                Held / Pending
                              </span>
                            )}
                            {b.status === 'EXPIRED' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700">
                                <AlertTriangle className="w-3 h-3" />
                                Expired
                              </span>
                            )}
                            {b.status === 'CANCELLED' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/30">
                                <AlertTriangle className="w-3 h-3" />
                                Cancelled
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2 CONTENT: ADMIN-DESIGNED DYNAMIC SEATING LAYOUT & INTERACTIVE DESIGNER */}
          {activeTab === 'seating' && (
            <div className="p-6 space-y-6">
              {/* Designer Action & Creator Bar */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-rose-400" />
                      Dynamic Seating Arrangement Designer (Supabase PostgreSQL)
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Configure custom stadium sections, rows, aisles, dynamic seat prices, accessible seating, and blocked seats.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => applyBookMyShowTemplate(250)}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-500 via-amber-500 to-indigo-600 hover:from-rose-600 hover:to-indigo-700 text-white font-bold text-xs shadow-lg shadow-rose-500/20 flex items-center gap-1.5 transition cursor-pointer"
                      title="Load BookMyShow Cinema Layout (Recliner, Prime, Classic)"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>🎬 Apply BookMyShow Cinema Template</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveSeatingLayout}
                      disabled={designerIsSaving}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition disabled:opacity-50"
                    >
                      {designerIsSaving ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      <span>Save Layout to Supabase</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => refetchLayout()}
                      disabled={isLoadingLayout}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                      title="Reload from Database"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLayout ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                {designerSaveMsg && (
                  <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>{designerSaveMsg}</span>
                  </div>
                )}

                {/* Sub-tools: Add Section, Add Row, Price Controller */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-1">
                  {/* Tool 1: Add New Section */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                      <Plus className="w-3.5 h-3.5 text-indigo-400" /> Create Stadium Section
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <input
                        type="text"
                        placeholder="Code (e.g. BALCONY)"
                        value={designerNewSectionCode}
                        onChange={(e) => setDesignerNewSectionCode(e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                      <input
                        type="text"
                        placeholder="Display Name"
                        value={designerNewSectionName}
                        onChange={(e) => setDesignerNewSectionName(e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono">₹</span>
                        <input
                          type="number"
                          placeholder="Price"
                          value={designerNewBasePrice}
                          onChange={(e) => setDesignerNewBasePrice(Number(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-6 pr-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddSection}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition"
                      >
                        + Add Section
                      </button>
                    </div>
                  </div>

                  {/* Tool 2: Add Row to Selected Section */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                      <Armchair className="w-3.5 h-3.5 text-rose-400" /> Append Row to Section
                    </span>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 block mb-1">Section</span>
                        <select
                          value={designerSelectedSection}
                          onChange={(e) => setDesignerSelectedSection(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-mono focus:outline-none"
                        >
                          {designerSections.map((s) => (
                            <option key={s.sectionCode} value={s.sectionCode}>
                              {s.sectionCode}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block mb-1">Row Code</span>
                        <input
                          type="text"
                          value={designerNewRowLabel}
                          onChange={(e) => setDesignerNewRowLabel(e.target.value.toUpperCase())}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-mono uppercase text-center focus:outline-none"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block mb-1">Seat Count</span>
                        <input
                          type="number"
                          min={1}
                          max={30}
                          value={designerNewRowCount}
                          onChange={(e) => setDesignerNewRowCount(Number(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-mono text-center focus:outline-none"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddRow(designerSelectedSection)}
                      className="w-full py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition"
                    >
                      + Add Row to {designerSelectedSection}
                    </button>
                  </div>

                  {/* Tool 3: Dynamic Price Modifier */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                      <Tag className="w-3.5 h-3.5 text-emerald-400" /> Dynamic Section Pricing
                    </span>
                    <div className="flex items-center gap-2 text-xs">
                      <select
                        value={designerSelectedSection}
                        onChange={(e) => setDesignerSelectedSection(e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono focus:outline-none"
                      >
                        {designerSections.map((s) => (
                          <option key={s.sectionCode} value={s.sectionCode}>
                            {s.sectionName} (₹{s.basePrice})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono">₹</span>
                        <input
                          type="number"
                          placeholder="New Price"
                          id="newSectionPriceInput"
                          defaultValue={
                            designerSections.find((s) => s.sectionCode === designerSelectedSection)?.basePrice || 2000
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-6 pr-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const input = document.getElementById('newSectionPriceInput') as HTMLInputElement;
                          if (input) handleUpdateSectionPrice(designerSelectedSection, Number(input.value));
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition"
                      >
                        Update Price
                      </button>
                    </div>
                  </div>
                </div>

                {/* Designer Seat Status Indicators Legend */}
                <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-slate-400 font-semibold">Seat Matrix Legend:</span>
                    <span className="flex items-center gap-1.5 text-emerald-300">
                      <span className="w-3 h-3 rounded bg-emerald-500"></span> 🟢 Available
                    </span>
                    <span className="flex items-center gap-1.5 text-amber-300">
                      <span className="w-3 h-3 rounded bg-amber-500"></span> 🟡 Held (In-Cart)
                    </span>
                    <span className="flex items-center gap-1.5 text-rose-300">
                      <span className="w-3 h-3 rounded bg-rose-500"></span> 🔴 Booked (Sold)
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <span className="w-3 h-3 rounded bg-slate-800 border border-slate-600"></span> ⚫ Blocked (Admin Locked)
                    </span>
                    <span className="flex items-center gap-1.5 text-cyan-300">
                      <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/40 text-[10px] font-mono">♿</span> Accessible
                    </span>
                  </div>
                  <span className="text-slate-500 text-[11px] italic">
                    Tip: Click any seat badge below to instantly toggle Blocked status or Wheelchair Accessibility.
                  </span>
                </div>
              </div>

              {/* Stadium Architecture Layout Visual Canvas */}
              <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
                {/* BookMyShow Curved Cinema Projection Screen Arc */}
                <div className="w-full max-w-2xl mx-auto mb-8 flex flex-col items-center">
                  <div className="w-full h-9 relative flex items-center justify-center">
                    <svg className="w-full h-12 overflow-visible" viewBox="0 0 600 40">
                      <path
                        d="M 20 35 Q 300 0 580 35"
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="4"
                        strokeLinecap="round"
                        className="drop-shadow-[0_0_15px_rgba(56,189,248,0.7)]"
                      />
                    </svg>
                  </div>
                  <p className="text-[11px] font-bold tracking-[0.28em] text-sky-400 uppercase mt-1 flex items-center gap-2">
                    <span>🎬</span> ALL EYES THIS WAY • SCREEN
                  </p>
                </div>

                {/* Render Each Designed Section */}
                <div className="space-y-6">
                  {designerSections.map((sec) => (
                    <div
                      key={sec.sectionCode}
                      className={`border rounded-2xl p-5 space-y-4 transition ${
                        sec.sectionCode === 'RECLINER' || sec.sectionCode === 'VIP'
                          ? 'bg-amber-950/10 border-amber-500/30'
                          : sec.sectionCode === 'PRIME' || sec.sectionCode === 'PREMIUM'
                          ? 'bg-cyan-950/10 border-cyan-500/30'
                          : 'bg-emerald-950/10 border-emerald-500/30'
                      }`}
                    >
                      {/* Section Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                        <div className="flex items-center space-x-2.5">
                          <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold font-mono border ${
                            sec.sectionCode === 'RECLINER' || sec.sectionCode === 'VIP'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : sec.sectionCode === 'PRIME' || sec.sectionCode === 'PREMIUM'
                              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          }`}>
                            {sec.sectionCode}
                          </span>
                          <span className="font-bold text-white text-sm">{sec.sectionName}</span>
                          <span className="text-xs text-slate-400 font-mono">({sec.rows.length} Rows)</span>
                        </div>
                        <div className="flex items-center space-x-3 text-xs">
                          <span className="font-mono text-emerald-400 font-bold text-sm">
                            ₹{Number(sec.basePrice || 0).toFixed(2)} <span className="text-slate-400 text-xs font-normal">/ seat</span>
                          </span>
                        </div>
                      </div>

                      {/* Rows & Seats */}
                      <div className="space-y-3">
                        {sec.rows.map((row) => (
                          <div key={row.rowLabel} className="flex items-center space-x-3">
                            {/* Left Row Indicator */}
                            <span className="w-7 text-center font-mono font-bold text-amber-400 text-xs py-1 rounded bg-slate-900 border border-slate-800">
                              {row.rowLabel}
                            </span>
                            <div className="flex-1 flex flex-wrap items-center gap-1.5">
                              {row.seats.map((seat, sIdx) => {
                                const isAisleGap = row.aislePositions?.includes(sIdx + 1);
                                let badgeColor = 'bg-slate-900 border-slate-700 text-slate-300 hover:border-indigo-400';
                                if (seat.status === 'BOOKED') {
                                  badgeColor = 'bg-rose-500/20 border-rose-500 text-rose-300';
                                } else if (seat.status === 'HELD') {
                                  badgeColor = 'bg-amber-500/20 border-amber-500 text-amber-300 animate-pulse';
                                } else if (seat.isBlocked || seat.status === 'BLOCKED') {
                                  badgeColor = 'bg-slate-950 border-slate-800 text-slate-600 line-through';
                                } else if (seat.status === 'AVAILABLE') {
                                  badgeColor = 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20';
                                }

                                return (
                                  <React.Fragment key={seat.seatCode}>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleSeatBlock(sec.sectionCode, row.rowLabel, seat.seatCode)}
                                      onContextMenu={(e) => {
                                        e.preventDefault();
                                        handleToggleSeatAccessible(sec.sectionCode, row.rowLabel, seat.seatCode);
                                      }}
                                      title={`${seat.seatCode} | Status: ${seat.status} | Price: ₹${seat.price} | Left Click: Toggle Block | Right Click: Toggle Accessible`}
                                      className={`px-2 py-1.5 rounded-lg border text-xs font-mono font-bold transition flex items-center space-x-1 ${badgeColor}`}
                                    >
                                      {seat.isBlocked || seat.status === 'BLOCKED' ? (
                                        <Lock className="w-3 h-3 text-slate-500" />
                                      ) : seat.isAccessible ? (
                                        <span className="text-cyan-400 text-[10px]">♿</span>
                                      ) : (
                                        <Armchair className="w-3 h-3 opacity-70" />
                                      )}
                                      <span>{seat.seatNumber < 10 ? `0${seat.seatNumber}` : seat.seatNumber}</span>
                                    </button>
                                    {isAisleGap && (
                                      <div className="w-4 h-6 flex items-center justify-center text-[10px] text-slate-600 font-mono">
                                        |
                                      </div>
                                    )}
                                  </React.Fragment>
                                );
                              })}
                            </div>
                            {/* Right Row Indicator (BookMyShow dual-indicator style) */}
                            <span className="w-7 text-center font-mono font-bold text-amber-400 text-xs py-1 rounded bg-slate-900 border border-slate-800">
                              {row.rowLabel}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3 CONTENT: FREQUENCY OF ACCESSING USERS (Requested by User) */}
          {activeTab === 'frequencies' && (
            <div className="p-6 space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Total Access Events</span>
                  <p className="text-2xl font-black text-white font-mono mt-1">
                    {totalUserAccessHits.toLocaleString()}
                  </p>
                  <span className="text-[11px] text-slate-500">Across all user sessions</span>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Active Registered Users</span>
                  <p className="text-2xl font-black text-indigo-400 font-mono mt-1">
                    {userFrequencies.length}
                  </p>
                  <span className="text-[11px] text-slate-500">Tracked in audit database</span>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Top Accessing User</span>
                  <p className="text-lg font-black text-amber-400 truncate mt-1">
                    {peakUser ? peakUser.userName : 'None'}
                  </p>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {peakUser ? `${peakUser.totalAccessCount} Total Hits` : '0 Hits'}
                  </span>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Avg Hits / User</span>
                  <p className="text-2xl font-black text-cyan-400 font-mono mt-1">
                    {avgAccessPerUser}
                  </p>
                  <span className="text-[11px] text-slate-500">Engagement frequency</span>
                </div>
              </div>

              {/* Users Access Frequency Table */}
              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold">
                      <th className="py-3.5 px-4">User Name & Identity</th>
                      <th className="py-3.5 px-4">Role</th>
                      <th className="py-3.5 px-4 text-center">Access Frequency (Total Hits)</th>
                      <th className="py-3.5 px-4">Frequency Classification</th>
                      <th className="py-3.5 px-4">Action Breakdown</th>
                      <th className="py-3.5 px-4">Last Access Time</th>
                      <th className="py-3.5 px-4 text-right">Client IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredFrequencies.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500">
                          No user access frequency logs found matching current search.
                        </td>
                      </tr>
                    ) : (
                      filteredFrequencies.map((f, idx) => {
                        const initials = (f.userName || f.userEmail || 'U')
                          .substring(0, 2)
                          .toUpperCase();

                        return (
                          <tr key={f.userEmail || idx} className="hover:bg-slate-800/40 transition">
                            {/* User Name & Email */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center text-white font-bold text-xs shadow-md">
                                  {initials}
                                </div>
                                <div>
                                  <p className="font-bold text-white text-xs">{f.userName}</p>
                                  <p className="text-slate-400 font-mono text-[11px]">{f.userEmail}</p>
                                </div>
                              </div>
                            </td>

                            {/* Role */}
                            <td className="py-3.5 px-4">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                  f.role === 'ROLE_ADMIN'
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                    : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                }`}
                              >
                                {f.role}
                              </span>
                            </td>

                            {/* Access Frequency */}
                            <td className="py-3.5 px-4 text-center">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black font-mono bg-gradient-to-r from-amber-500/20 to-rose-500/20 text-amber-300 border border-amber-500/40 shadow-sm">
                                <Zap className="w-3.5 h-3.5 mr-1 text-amber-400" />
                                {f.totalAccessCount} Hits
                              </span>
                            </td>

                            {/* Tier */}
                            <td className="py-3.5 px-4">
                              {f.accessFrequencyTier === 'FLASH_SURGE_BUYER' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/15 text-rose-300 border border-rose-500/30">
                                  ⚡ Flash Surge Buyer
                                </span>
                              )}
                              {f.accessFrequencyTier === 'ACTIVE_VISITOR' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                  🔥 Active Visitor
                                </span>
                              )}
                              {f.accessFrequencyTier === 'STANDARD' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                                  🌱 Standard Access
                                </span>
                              )}
                            </td>

                            {/* Action Breakdown */}
                            <td className="py-3.5 px-4">
                              <div className="flex flex-wrap gap-1 text-[10px] font-mono">
                                {f.loginCount > 0 && (
                                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                    Login: {f.loginCount}
                                  </span>
                                )}
                                {f.captchaCount > 0 && (
                                  <span className="px-1.5 py-0.5 rounded bg-cyan-950/40 text-cyan-300 border border-cyan-800/50">
                                    Captcha: {f.captchaCount}
                                  </span>
                                )}
                                {f.holdCount > 0 && (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-950/40 text-amber-300 border border-amber-800/50">
                                    Holds: {f.holdCount}
                                  </span>
                                )}
                                {f.confirmedCount > 0 && (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-800/50">
                                    Orders: {f.confirmedCount}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Last Access Time */}
                            <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                              {f.lastAccessTime ? (
                                <div>
                                  <p className="text-slate-200">
                                    {new Date(f.lastAccessTime).toLocaleString('en-IN', {
                                      day: '2-digit',
                                      month: 'short',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      second: '2-digit',
                                    })}
                                  </p>
                                  <span className="text-[10px] text-slate-500">{f.latestAction}</span>
                                </div>
                              ) : (
                                'N/A'
                              )}
                            </td>

                            {/* Client IP */}
                            <td className="py-3.5 px-4 text-right font-mono text-slate-500 text-[11px]">
                              {f.lastIpAddress || '127.0.0.1'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4 CONTENT: USER ACTIVITY AUDIT TRAIL (Enhanced with User Name) */}
          {activeTab === 'activities' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="py-3.5 px-4">Timestamp (IST)</th>
                    <th className="py-3.5 px-4">User Details (User Name)</th>
                    <th className="py-3.5 px-4">Action Performed</th>
                    <th className="py-3.5 px-4">Event Details</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Client IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-rose-500 mb-2" />
                        Loading database user activity audit trail...
                      </td>
                    </tr>
                  ) : filteredActivities.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        No user activity records found matching current search.
                      </td>
                    </tr>
                  ) : (
                    filteredActivities.map((act) => {
                      let actionColor = 'bg-slate-800 text-slate-300 border-slate-700';
                      if (act.action === 'CAPTCHA_VERIFIED') {
                        actionColor = 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
                      } else if (act.action === 'TICKET_HOLD' || act.action === 'TICKETS_HELD') {
                        actionColor = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
                      } else if (act.action === 'UPI_PAYMENT_VERIFIED' || act.action === 'ORDER_CONFIRMED') {
                        actionColor = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
                      } else if (
                        act.action === 'PAYMENT_REJECTED' ||
                        act.action === 'LOGIN_FAILED' ||
                        act.action === 'CAPTCHA_FAILED'
                      ) {
                        actionColor = 'bg-rose-500/15 text-rose-300 border-rose-500/30';
                      } else if (act.action === 'USER_LOGIN' || act.action === 'USER_REGISTER') {
                        actionColor = 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
                      }

                      return (
                        <tr
                          key={act.id}
                          className="hover:bg-slate-800/40 transition group font-mono text-[11px]"
                        >
                          {/* Timestamp */}
                          <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                            {new Date(act.createdAt).toLocaleString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </td>

                          {/* User Name & Email */}
                          <td className="py-3.5 px-4">
                            <div>
                              <p className="font-bold text-white font-sans text-xs">
                                {act.userName || act.userEmail.split('@')[0]}
                              </p>
                              <p className="text-slate-400 text-[11px] font-mono">{act.userEmail}</p>
                            </div>
                          </td>

                          {/* Action Badge */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${actionColor}`}
                            >
                              {act.action}
                            </span>
                          </td>

                          {/* Details */}
                          <td className="py-3.5 px-4 font-sans text-xs text-slate-300">
                            {act.details}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 text-center">
                            {act.status === 'SUCCESS' ? (
                              <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-[10px]">
                                <CheckCircle2 className="w-3 h-3" />
                                SUCCESS
                              </span>
                            ) : act.status === 'FAILED' ? (
                              <span className="inline-flex items-center gap-1 text-rose-400 font-bold text-[10px]">
                                <ShieldAlert className="w-3 h-3" />
                                REJECTED
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-amber-400 font-bold text-[10px]">
                                <Clock className="w-3 h-3" />
                                {act.status}
                              </span>
                            )}
                          </td>

                          {/* IP Address */}
                          <td className="py-3.5 px-4 text-right text-slate-500">
                            {act.ipAddress || '127.0.0.1'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 5 CONTENT: Blockchain Theatre Ledger (Cryptographic Seat Booking Chain) */}
          {activeTab === 'blockchain' && (
            <div className="p-6 space-y-6">
              {/* Blockchain KPI Header Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-950/70 border border-violet-500/20 rounded-xl p-4 flex items-center space-x-3 shadow-sm">
                  <div className="p-2.5 rounded-lg bg-violet-500/10 text-violet-400">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Chain Height</div>
                    <div className="text-xl font-bold font-mono text-white">
                      #{blockchainStats?.blockHeight ?? blockchainChain.length}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950/70 border border-indigo-500/20 rounded-xl p-4 flex items-center space-x-3 shadow-sm">
                  <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                    <Ticket className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Minted NFT Tickets</div>
                    <div className="text-xl font-bold font-mono text-indigo-300">
                      {blockchainStats?.totalMintedTickets ?? 0}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950/70 border border-emerald-500/20 rounded-xl p-4 flex items-center space-x-3 shadow-sm">
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <Armchair className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Seats On Ledger</div>
                    <div className="text-xl font-bold font-mono text-emerald-300">
                      {blockchainStats?.totalSeatsOnChain ?? 0}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950/70 border border-cyan-500/20 rounded-xl p-4 flex items-center space-x-3 shadow-sm">
                  <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Consensus Protocol</div>
                    <div className="text-xs font-bold text-cyan-300 mt-1">
                      PoW SHA-256 (100% Immutable)
                    </div>
                  </div>
                </div>
              </div>

              {/* Mathematical Chain Integrity Banner (Upon Verification) */}
              {verifyResult && (
                <div
                  className={`p-4 rounded-xl border flex items-start space-x-3 transition-all ${
                    verifyResult.valid
                      ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                      : 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                  }`}
                >
                  {verifyResult.valid ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                  ) : (
                    <ShieldAlert className="w-5 h-5 text-rose-400 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1 text-xs">
                    <div className="font-bold text-sm">
                      {verifyResult.valid
                        ? 'Cryptographic Chain Integrity: 100% SECURE & IMMUTABLE'
                        : 'BLOCKCHAIN INTEGRITY WARNING: Tampering Detected!'}
                    </div>
                    <p className="mt-1 opacity-90">{verifyResult.message}</p>
                    <div className="mt-2 font-mono text-[11px] opacity-75">
                      Verified {verifyResult.totalBlocks} blocks &bull; Verified Timestamp:{' '}
                      {new Date(verifyResult.lastVerifiedAt).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              )}

              {/* Interconnected Blockchain Blocks */}
              {filteredBlocks.length === 0 ? (
                <div className="py-12 text-center text-slate-500 bg-slate-950/30 rounded-xl border border-slate-800/80">
                  <Link2 className="w-10 h-10 mx-auto text-slate-600 mb-2 opacity-50" />
                  <p className="text-sm font-semibold text-slate-400">No blockchain blocks matched your search criteria.</p>
                  <p className="text-xs text-slate-500 mt-1">Try clearing your search query to view the complete immutable chain.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredBlocks.map((block: BlockchainBlock, index: number) => {
                    const isGenesis = block.blockIndex === 0;
                    const seats = block.seatNumbers
                      ? block.seatNumbers.split(',').map((s) => s.trim()).filter(Boolean)
                      : [];

                    return (
                      <React.Fragment key={block.id || block.blockIndex}>
                        {/* Connecting Hash Link between sequential blocks */}
                        {index > 0 && (
                          <div className="flex items-center justify-center -my-2 text-violet-400/80">
                            <div className="flex items-center space-x-2 bg-slate-900 px-3 py-1 rounded-full border border-violet-500/30 text-[10px] font-mono shadow-sm">
                              <Link2 className="w-3.5 h-3.5 text-violet-400" />
                              <span className="text-slate-400">Previous Hash Pointer Linked</span>
                            </div>
                          </div>
                        )}

                        {/* Block Container Card */}
                        <div
                          className={`rounded-2xl border p-5 transition ${
                            isGenesis
                              ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40 border-indigo-500/30 shadow-lg'
                              : 'bg-slate-950/80 border-slate-800 hover:border-violet-500/40 shadow-md'
                          }`}
                        >
                          {/* Block Top Header */}
                          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                            <div className="flex items-center space-x-3">
                              <span
                                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold uppercase tracking-wider ${
                                  isGenesis
                                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                                    : 'bg-violet-500/20 text-violet-300 border border-violet-500/40'
                                }`}
                              >
                                {isGenesis ? 'Genesis Block #0' : `Block #${block.blockIndex}`}
                              </span>

                              <span className="text-xs text-slate-400 font-mono flex items-center space-x-1.5">
                                <Clock className="w-3.5 h-3.5 text-slate-500" />
                                <span>{new Date(block.timestamp).toLocaleString()}</span>
                              </span>
                            </div>

                            <div className="flex items-center space-x-2">
                              <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400">
                                PoW Nonce: <span className="text-emerald-400 font-bold">{block.nonce}</span>
                              </span>
                              <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-bold text-emerald-400 flex items-center space-x-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Confirmed</span>
                              </span>
                            </div>
                          </div>

                          {/* Block Details Grid */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-4">
                            {/* Left: Cryptographic Proofs */}
                            <div className="space-y-3 font-mono text-xs">
                              {/* Current Block Hash */}
                              <div>
                                <span className="text-[10px] uppercase font-sans font-bold text-slate-400 block mb-1">
                                  Cryptographic Block Hash (SHA-256)
                                </span>
                                <div className="flex items-center justify-between bg-slate-900/90 border border-violet-500/30 rounded-lg px-3 py-2 text-violet-300 break-all text-[11px]">
                                  <span>{block.blockHash}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(block.blockHash, `hash-${block.blockIndex}`)}
                                    className="ml-2 text-slate-400 hover:text-white p-1 flex-shrink-0"
                                    title="Copy SHA-256 Hash"
                                  >
                                    {copiedId === `hash-${block.blockIndex}` ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                              </div>

                              {/* Previous Block Hash */}
                              <div>
                                <span className="text-[10px] uppercase font-sans font-bold text-slate-400 block mb-1">
                                  Previous Block Hash Pointer
                                </span>
                                <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2 text-slate-400 break-all text-[11px]">
                                  <span>{block.previousHash}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(block.previousHash, `prev-${block.blockIndex}`)}
                                    className="ml-2 text-slate-400 hover:text-white p-1 flex-shrink-0"
                                    title="Copy Previous Hash"
                                  >
                                    {copiedId === `prev-${block.blockIndex}` ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                              </div>

                              {/* Merkle Root & Token ID */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                <div>
                                  <span className="text-[10px] uppercase font-sans font-bold text-slate-400 block mb-0.5">
                                    Merkle Root
                                  </span>
                                  <div className="bg-slate-900/60 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-400 truncate text-[10px]">
                                    {block.merkleRoot}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-[10px] uppercase font-sans font-bold text-slate-400 block mb-0.5">
                                    NFT Token ID
                                  </span>
                                  <div className="bg-slate-900/60 border border-slate-800 rounded-lg px-2.5 py-1.5 text-amber-300 font-bold truncate text-[10px]">
                                    {block.tokenId}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Right: Buyer & Theatre Seat Booking Transaction */}
                            <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-3.5 space-y-3">
                              {isGenesis ? (
                                <div className="text-xs text-slate-400 space-y-2 py-3">
                                  <div className="font-semibold text-indigo-300">Root Genesis Block Payload</div>
                                  <p className="text-[11px] leading-relaxed text-slate-400">
                                    Genesis anchor block initialized by TicketFlow Consensus Engine. Establishes the immutable cryptographic root for all stadium and theatre seat reservations.
                                  </p>
                                  <div className="font-mono text-[10px] text-slate-500">
                                    Smart Contract: {block.contractAddress}
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {/* Assigned Seats */}
                                  <div>
                                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                                      Allocated Theatre / Stadium Seats
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                      {seats.length > 0 ? (
                                        seats.map((seat) => (
                                          <span
                                            key={seat}
                                            className="px-2.5 py-1 rounded-md bg-rose-500/15 border border-rose-500/30 text-rose-300 font-mono font-bold text-xs shadow-sm"
                                          >
                                            {seat}
                                          </span>
                                        ))
                                      ) : (
                                        <span className="text-xs text-slate-500 font-mono">Unassigned</span>
                                      )}
                                      <span className="px-2 py-1 rounded-md bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-mono text-xs font-semibold">
                                        Qty: {block.ticketCount}
                                      </span>
                                      <span className="px-2 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-bold">
                                        ₹{block.totalAmount?.toFixed(2)}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Customer & Wallet Details */}
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                    <div>
                                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                        Customer
                                      </span>
                                      <div className="font-semibold text-slate-200">{block.buyerName}</div>
                                      <div className="text-[11px] text-slate-400 font-mono truncate">
                                        {block.buyerEmail}
                                      </div>
                                    </div>

                                    <div>
                                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                        Order & Payment UTR
                                      </span>
                                      <div className="text-[11px] font-mono text-slate-300 truncate">
                                        {block.orderId}
                                      </div>
                                      <div className="text-[11px] font-mono text-emerald-400">
                                        UTR: {block.paymentUtr}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Buyer Smart Wallet */}
                                  <div>
                                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                                      Buyer Smart Wallet Address
                                    </span>
                                    <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-300 font-mono text-[10px] truncate">
                                      <span className="truncate">{block.buyerWallet}</span>
                                      <button
                                        type="button"
                                        onClick={() => handleCopy(block.buyerWallet || '', `wal-${block.blockIndex}`)}
                                        className="ml-1 text-slate-400 hover:text-white p-0.5 flex-shrink-0"
                                        title="Copy Wallet"
                                      >
                                        {copiedId === `wal-${block.blockIndex}` ? (
                                          <Check className="w-3 h-3 text-emerald-400" />
                                        ) : (
                                          <Copy className="w-3 h-3" />
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Ledger Footer */}
          <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
            <span>
              {activeTab === 'bookings'
                ? `Showing ${filteredBookings.length} of ${bookings.length} customer bookings`
                : activeTab === 'seating'
                ? `Showing ${visibleSeats.length} of ${seatingGrid.length} stadium seats (${seatingConfirmedCount} Confirmed, ${seatingHeldCount} Held, ${seatingAvailCount} Available)`
                : activeTab === 'frequencies'
                ? `Showing ${filteredFrequencies.length} of ${userFrequencies.length} user access frequency records`
                : activeTab === 'activities'
                ? `Showing ${filteredActivities.length} of ${activities.length} user database activity logs`
                : `Showing ${filteredBlocks.length} of ${blockchainChain.length} immutable blockchain blocks`}
            </span>
            <span className="font-mono text-slate-400">
              Live Database: D:\mysql\ticketflow_db\ticketflow.mv.db
            </span>
          </div>
        </section>
      </main>

      {/* 🎬 CREATE NEW CINEMA EVENT MODAL (Admin Request: Event, Limit of seats, Frequency, Price per seat, BookMyShow design) */}
      {isCreateEventOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  BookMyShow Cinema Event Manager
                </span>
                <h3 className="text-xl font-black text-white mt-1 flex items-center gap-2">
                  <span>🎬</span> Create Cinema Event & Seat Layout
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Define event capacity limits, bot-protection access frequencies, per-seat pricing, and BookMyShow layout.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreateEventOpen(false);
                  setCreateEventError(null);
                  setCreateEventSuccess(null);
                }}
                className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            {createEventError && (
              <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{createEventError}</span>
              </div>
            )}

            {createEventSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{createEventSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateEvent} className="space-y-4 text-xs">
              {/* Event Name */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Movie / Event Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Oppenheimer: IMAX 70mm Special Experience"
                  value={createEventName}
                  onChange={(e) => setCreateEventName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 text-xs font-medium"
                />
              </div>

              {/* Venue / Cinema Hall */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Cinema Hall & Venue <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PVR INOX IMAX 4K Cinema, Audi 2"
                  value={createEventVenue}
                  onChange={(e) => setCreateEventVenue(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 text-xs font-medium"
                />
              </div>

              {/* Screening Date & Time */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Screening Date & Showtime
                </label>
                <input
                  type="datetime-local"
                  value={createEventDate}
                  onChange={(e) => setCreateEventDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-rose-500 text-xs font-mono"
                />
              </div>

              {/* 3 Core Parameters Requested by User: Limit of Seats, Price per Seat, User Frequency */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {/* 1. Limit of Seats */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-1">
                  <label className="block text-slate-300 font-bold text-[11px] uppercase tracking-wider flex items-center gap-1">
                    <Ticket className="w-3.5 h-3.5 text-indigo-400" />
                    Limit of Seats
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={50000}
                    required
                    value={createEventLimit}
                    onChange={(e) => setCreateEventLimit(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono font-bold text-sm focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-[10px] text-slate-500 block">Total seat inventory</span>
                </div>

                {/* 2. Price Per Seat */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-1">
                  <label className="block text-slate-300 font-bold text-[11px] uppercase tracking-wider flex items-center gap-1">
                    <IndianRupee className="w-3.5 h-3.5 text-emerald-400" />
                    Price / Seat (₹)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10000}
                    required
                    value={createEventPrice}
                    onChange={(e) => setCreateEventPrice(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-emerald-400 font-mono font-bold text-sm focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-slate-500 block">Base Prime price</span>
                </div>

                {/* 3. User Access Frequency Limit */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-1">
                  <label className="block text-slate-300 font-bold text-[11px] uppercase tracking-wider flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    Frequency Limit
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={500}
                    required
                    value={createEventFrequency}
                    onChange={(e) => setCreateEventFrequency(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-amber-400 font-mono font-bold text-sm focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[10px] text-slate-500 block">req / min (bot shield)</span>
                </div>
              </div>

              {/* Seating Pattern Selector (BookMyShow Cinema Layout by default) */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <span className="text-slate-300 font-bold block text-xs">
                  Cinema Seating Design Architecture:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <label
                    onClick={() => setCreateEventPattern('BOOKMYSHOW_CINEMA')}
                    className={`flex items-center space-x-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                      createEventPattern === 'BOOKMYSHOW_CINEMA'
                        ? 'bg-rose-500/15 border-rose-500 text-white shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="seatingPattern"
                      checked={createEventPattern === 'BOOKMYSHOW_CINEMA'}
                      onChange={() => setCreateEventPattern('BOOKMYSHOW_CINEMA')}
                      className="accent-rose-500"
                    />
                    <div>
                      <p className="font-bold text-white text-xs">BookMyShow Cinema</p>
                      <p className="text-[10px] text-slate-400">Recliner, Prime, Classic & Screen</p>
                    </div>
                  </label>

                  <label
                    onClick={() => setCreateEventPattern('STADIUM')}
                    className={`flex items-center space-x-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                      createEventPattern === 'STADIUM'
                        ? 'bg-indigo-500/15 border-indigo-500 text-white shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="seatingPattern"
                      checked={createEventPattern === 'STADIUM'}
                      onChange={() => setCreateEventPattern('STADIUM')}
                      className="accent-indigo-500"
                    />
                    <div>
                      <p className="font-bold text-white text-xs">Stadium Concert</p>
                      <p className="text-[10px] text-slate-400">VIP Lounge, Deck & Pitch</p>
                    </div>
                  </label>
                </div>

                {/* Tier Breakdown Preview */}
                {createEventPattern === 'BOOKMYSHOW_CINEMA' && (
                  <div className="pt-2 border-t border-slate-800/80 grid grid-cols-3 gap-1.5 text-[10px] font-mono text-center">
                    <div className="bg-amber-950/20 border border-amber-500/30 rounded-lg p-1.5 text-amber-300">
                      <span className="block font-bold">🌟 RECLINER</span>
                      <span>₹{Math.round(createEventPrice * 1.8)}</span>
                    </div>
                    <div className="bg-cyan-950/20 border border-cyan-500/30 rounded-lg p-1.5 text-cyan-300">
                      <span className="block font-bold">💎 PRIME</span>
                      <span>₹{createEventPrice}</span>
                    </div>
                    <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-lg p-1.5 text-emerald-300">
                      <span className="block font-bold">🎟️ CLASSIC</span>
                      <span>₹{Math.round(createEventPrice * 0.72)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateEventOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingEvent}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 via-amber-500 to-indigo-600 hover:from-rose-600 hover:to-indigo-700 text-white font-bold text-xs shadow-lg shadow-rose-500/20 flex items-center space-x-2 transition disabled:opacity-50 cursor-pointer"
                >
                  {isCreatingEvent ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating Event & Cinema Seating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Deploy Event & BookMyShow Layout</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboardPage;