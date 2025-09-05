import React, { useState } from 'react';
import { motion } from 'framer-motion';
import PageLayout from '@/components/PageLayout';
import { useReferrals } from '@/hooks/useReferrals';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  Users, 
  Gift, 
  Share2, 
  Copy, 
  Mail, 
  MessageCircle, 
  Trophy,
  DollarSign,
  Clock,
  CheckCircle,
  Plus,
  RefreshCcw,
  ExternalLink,
  Zap,
  Send,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const Referrals: React.FC = () => {
  const { 
    stats, 
    leaderboard, 
    loading, 
    generateReferralCode, 
    claimRewards, 
    shareReferralCode,
    deleteReferral,
    refreshStats,
    refreshLeaderboard
  } = useReferrals();

  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [selectedReferralCode, setSelectedReferralCode] = useState<string>('');
  const [newReferralEmail, setNewReferralEmail] = useState('');
  const [newReferralPhone, setNewReferralPhone] = useState('');
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailRecipientName, setEmailRecipientName] = useState('');
  const [personalMessage, setPersonalMessage] = useState('');
  const [generating, setGenerating] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const handleGenerateCode = async () => {
    setGenerating(true);
    try {
      const result = await generateReferralCode(
        newReferralEmail || undefined, 
        newReferralPhone || undefined
      );
      
      if (result) {
        setSelectedReferralCode(result.code);
        setShareDialogOpen(true);
        setNewReferralEmail('');
        setNewReferralPhone('');
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleClaimRewards = async () => {
    setClaiming(true);
    try {
      await claimRewards();
    } finally {
      setClaiming(false);
    }
  };

  const handleShare = async (method: 'copy' | 'email' | 'sms' | 'social') => {
    if (method === 'email') {
      // Open email dialog for personalized email
      setEmailDialogOpen(true);
      setShareDialogOpen(false);
    } else {
      await shareReferralCode(selectedReferralCode, method);
      if (method !== 'copy') {
        setShareDialogOpen(false);
      }
    }
  };

  const handleSendEmail = async () => {
    if (!emailRecipient) {
      toast.error('Please enter recipient email address');
      return;
    }

    setSendingEmail(true);
    try {
      // Get user profile for referrer name
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single();

      const referrerName = profile?.display_name || user.email?.split('@')[0] || 'Your friend';

      await shareReferralCode(selectedReferralCode, 'email', {
        recipientEmail: emailRecipient,
        recipientName: emailRecipientName || emailRecipient.split('@')[0],
        personalMessage: personalMessage || undefined,
        referrerName
      });

      // Clear form and close dialog
      setEmailRecipient('');
      setEmailRecipientName('');
      setPersonalMessage('');
      setEmailDialogOpen(false);
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Failed to send email');
    } finally {
      setSendingEmail(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'registered': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'rewarded': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'registered': return <Users className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'rewarded': return <Gift className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleDeleteReferral = async (referralId: string, referralCode: string) => {
    try {
      const result = await deleteReferral(referralId);
      
      if (result.success) {
        toast.success(`Referral code ${referralCode} deleted successfully`);
      } else {
        toast.error(result.error || 'Failed to delete referral');
      }
    } catch (error) {
      console.error('Error deleting referral:', error);
      toast.error('Failed to delete referral');
    }
  };

  return (
    <PageLayout>
      <div className="container max-w-6xl">
        {/* Header */}
        <motion.header 
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center">
                <Users className="h-8 w-8 mr-3 text-primary" />
                Referral Program
              </h1>
              <p className="text-muted-foreground mt-2">
                Invite friends and earn rewards when they join and start saving
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={() => { refreshStats(); refreshLeaderboard(); }}>
                <RefreshCcw className="h-4 w-4" />
              </Button>
              
              {stats && stats.unclaimed_rewards > 0 && (
                <Button 
                  onClick={handleClaimRewards}
                  disabled={claiming}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Gift className="h-4 w-4 mr-2" />
                  Claim {formatCurrency(stats.unclaimed_rewards)}
                </Button>
              )}
            </div>
          </div>
        </motion.header>

        {/* Stats Overview */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {loading ? (
            [...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Referrals</p>
                      <p className="text-2xl font-bold">{stats?.total_referrals || 0}</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Successful</p>
                      <p className="text-2xl font-bold text-green-600">{stats?.completed_referrals || 0}</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Earned</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {formatCurrency(stats?.total_rewards || 0)}
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Pending</p>
                      <p className="text-2xl font-bold text-yellow-600">{stats?.pending_referrals || 0}</p>
                    </div>
                    <Clock className="h-8 w-8 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </motion.div>

        {/* Main Content Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Tabs defaultValue="dashboard" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="invite">Invite Friends</TabsTrigger>
              <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            </TabsList>

            {/* Dashboard Tab */}
            <TabsContent value="dashboard" className="space-y-6">
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Referral History */}
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Referral History</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {loading ? (
                        <div className="space-y-4">
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                              <div className="flex items-center space-x-3">
                                <Skeleton className="h-8 w-20" />
                                <div>
                                  <Skeleton className="h-4 w-32 mb-1" />
                                  <Skeleton className="h-3 w-24" />
                                </div>
                              </div>
                              <Skeleton className="h-6 w-16" />
                            </div>
                          ))}
                        </div>
                      ) : !stats?.referrals || stats.referrals.length === 0 ? (
                        <div className="text-center py-8">
                          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                          <h3 className="text-lg font-medium mb-2">No referrals yet</h3>
                          <p className="text-muted-foreground">Start inviting friends to see your referral history</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {stats.referrals.map((referral) => (
                            <div key={referral.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                              <div className="flex items-center space-x-3">
                                <Badge className={getStatusColor(referral.status)} variant="secondary">
                                  <div className="flex items-center space-x-1">
                                    {getStatusIcon(referral.status)}
                                    <span className="capitalize">{referral.status}</span>
                                  </div>
                                </Badge>
                                
                                <div>
                                  <p className="font-medium">
                                    {referral.referred_email || referral.referred_phone || `Code: ${referral.referral_code}`}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {formatDate(referral.created_at)}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-3">
                                <div className="text-right">
                                  <p className="font-semibold text-green-600">
                                    {referral.reward_amount > 0 ? formatCurrency(referral.reward_amount) : '-'}
                                  </p>
                                  {referral.reward_claimed && (
                                    <p className="text-xs text-muted-foreground">Claimed</p>
                                  )}
                                </div>
                                
                                {/* Delete button - only show for pending referrals */}
                                {referral.status === 'pending' && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-muted-foreground hover:text-destructive"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Referral</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete the referral code "{referral.referral_code}"? 
                                          This action cannot be undone and the referral link will no longer work.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleDeleteReferral(referral.id, referral.referral_code)}
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Quick Actions */}
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Zap className="h-5 w-5 mr-2" />
                        Quick Actions
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Button 
                        onClick={() => setShareDialogOpen(true)}
                        className="w-full"
                        variant="outline"
                      >
                        <Share2 className="h-4 w-4 mr-2" />
                        Share Referral Link
                      </Button>
                      
                      {stats && stats.unclaimed_rewards > 0 && (
                        <Button 
                          onClick={handleClaimRewards}
                          disabled={claiming}
                          className="w-full bg-green-600 hover:bg-green-700"
                        >
                          <Gift className="h-4 w-4 mr-2" />
                          Claim Rewards
                        </Button>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Rewards Program</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Friend signs up</span>
                        <Badge variant="secondary">$5.00</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Friend joins first circle</span>
                        <Badge variant="secondary">$10.00</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Friend makes first contribution</span>
                        <Badge variant="secondary">$15.00</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Invite Friends Tab */}
            <TabsContent value="invite" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Invite New Friends</CardTitle>
                  <p className="text-muted-foreground">
                    Generate a personalized referral link to share with friends
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">Friend's Email (Optional)</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="friend@example.com"
                        value={newReferralEmail}
                        onChange={(e) => setNewReferralEmail(e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="phone">Friend's Phone (Optional)</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        value={newReferralPhone}
                        onChange={(e) => setNewReferralPhone(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleGenerateCode}
                    disabled={generating}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {generating ? 'Generating...' : 'Generate Referral Link'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Leaderboard Tab */}
            <TabsContent value="leaderboard" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Trophy className="h-5 w-5 mr-2 text-yellow-500" />
                    Top Referrers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {leaderboard.length === 0 ? (
                    <div className="text-center py-8">
                      <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No leaderboard data yet</h3>
                      <p className="text-muted-foreground">Be the first to start referring friends!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {leaderboard.map((user, index) => (
                        <div key={user.user_id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center justify-center w-8 h-8">
                              {index < 3 ? (
                                <Trophy className={`h-5 w-5 ${
                                  index === 0 ? 'text-yellow-500' : 
                                  index === 1 ? 'text-gray-400' : 'text-amber-600'
                                }`} />
                              ) : (
                                <span className="text-sm font-semibold text-muted-foreground">
                                  #{user.rank}
                                </span>
                              )}
                            </div>
                            
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={user.avatar_url || undefined} />
                              <AvatarFallback>
                                {user.display_name?.charAt(0)?.toUpperCase() || '?'}
                              </AvatarFallback>
                            </Avatar>
                            
                            <div>
                              <p className="font-medium">{user.display_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {user.successful_referrals} successful referrals
                              </p>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <p className="font-semibold text-green-600">
                              {formatCurrency(user.total_rewards)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {user.total_referrals} total
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Share Dialog */}
        <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Share Your Referral Link</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Your referral link:</p>
                <p className="font-mono text-sm break-all">
                  {`${window.location.origin}/signup?ref=${selectedReferralCode}`}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <Button onClick={() => handleShare('copy')} variant="outline">
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Link
                </Button>
                
                <Button onClick={() => handleShare('email')} variant="outline">
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email
                </Button>
                
                <Button onClick={() => handleShare('sms')} variant="outline">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  SMS
                </Button>
                
                <Button onClick={() => handleShare('social')} variant="outline">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Email Dialog */}
        <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Send Personalized Referral Email</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recipient-email">Recipient Email *</Label>
                <Input
                  id="recipient-email"
                  type="email"
                  placeholder="friend@example.com"
                  value={emailRecipient}
                  onChange={(e) => setEmailRecipient(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="recipient-name">Recipient Name (Optional)</Label>
                <Input
                  id="recipient-name"
                  type="text"
                  placeholder="Friend's Name"
                  value={emailRecipientName}
                  onChange={(e) => setEmailRecipientName(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="personal-message">Personal Message (Optional)</Label>
                <textarea
                  id="personal-message"
                  className="w-full min-h-[80px] px-3 py-2 border border-input rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  placeholder="Add a personal message to make your invitation more engaging..."
                  value={personalMessage}
                  onChange={(e) => setPersonalMessage(e.target.value)}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground">
                  {personalMessage.length}/500 characters
                </p>
              </div>
              
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">
                    Professional Email Template
                  </span>
                </div>
                <p className="text-xs text-blue-700 mt-1">
                  Your email will include a beautiful template with your referral link, 
                  platform benefits, and your personal message.
                </p>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setEmailDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSendEmail}
                  disabled={!emailRecipient || sendingEmail}
                  className="flex-1"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {sendingEmail ? 'Sending...' : 'Send Email'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PageLayout>
  );
};

export default Referrals;
